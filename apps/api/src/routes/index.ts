import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { checkLlama405BFeasibility } from '../services/feasibility.js';
import { assertStartAllowed } from '../services/costControls.js';
import { listRunPodGpuTypes, listRunPodPods, startRunPodPod, stopRunPodPod, testRunPodConnection } from '../integrations/runpod.js';
import { listRepos, testGitHubToken } from '../integrations/github.js';
import { chatWithPrivateModel } from '../services/modelClient.js';
import { env } from '../utils/env.js';
import { getRuntimeStatus } from '../services/store.js';
import { createSession, createTask, listAuditLogs, listCostEvents, listModelRegistry as listPersistentModelRegistry, listSessions, listTaskLogs, listTasks, snapshot, updateSessionStatus, updateTaskStatus, writeAudit } from '../services/orchestrator.js';
import { summarizeTargetGpus } from '../services/runpodCatalog.js';
import { listModelRegistry, selectModelForTask } from '../services/modelRegistry.js';
import { checkRequiredModelAccess } from '../integrations/huggingface.js';
import { diagnoseSupabase } from '../integrations/supabase.js';
import { createCredential, deleteCredential, listCredentials, updateCredentialStatus } from '../services/credentialVault.js';
import { productionReadinessWarnings } from '../utils/env.js';
import { listApprovals, requestApproval, resolveApproval } from '../services/approvals.js';
import { checkAutoStop, emergencyStopAll, manualStopSession } from '../services/sessionSafety.js';

const modelRoleSchema = z.enum(['business_reasoning', 'research', 'architecture', 'coding', 'qa', 'database', 'devops', 'auto']);

const taskSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(3),
  taskType: z.string().default('business_strategy'),
  modelRole: modelRoleSchema.default('auto'),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  riskLevel: z.enum(['low', 'medium', 'high', 'critical']).default('low'),
  allowedTools: z.array(z.string()).default(['chat_only']),
  requiresApproval: z.boolean().default(false),
});

export async function registerRoutes(app: FastifyInstance) {
  app.get('/health', async () => ({ ok: true, service: 'wyndme-private-ai-api' }));
  app.get('/status', async () => ({
    model: env.MODEL_ID,
    privateByDefault: env.ALLOW_EXTERNAL_MODEL_PROVIDERS !== 'true',
    maxSessionHours: env.MAX_SESSION_HOURS,
    autoStopEnabled: env.AUTO_STOP_ENABLED === 'true',
    runtime: getRuntimeStatus(),
    productionReadinessWarnings: productionReadinessWarnings(),
  }));
  app.get('/state', async () => snapshot());
  app.get('/models', async () => listPersistentModelRegistry());
  app.get('/supabase/diagnostics', async () => diagnoseSupabase());
  app.get('/models/access-check', async () => checkRequiredModelAccess([...new Set((await listPersistentModelRegistry()).filter((model) => model.enabled).map((model) => model.modelName))]));
  app.post('/models/route-preview', async (req) => { const body = z.object({ taskType: z.string(), modelRole: modelRoleSchema.default('auto') }).parse(req.body); return selectModelForTask(body.taskType, body.modelRole); });



  app.get('/approvals', async (req) => { const query = z.object({ status: z.enum(['pending', 'approved', 'rejected']).optional() }).parse(req.query); return listApprovals(query.status); });
  app.post('/approvals', async (req) => requestApproval(z.object({ approvalType: z.enum(['runpod_start', 'runpod_delete', 'credential_delete', 'production_action']), requestedAction: z.string(), riskLevel: z.enum(['low', 'medium', 'high', 'critical']), requestedBy: z.enum(['admin', 'system', 'worker']).default('admin'), reason: z.string().optional() }).parse(req.body)));
  app.post('/approvals/:approvalId/resolve', async (req) => { const body = z.object({ status: z.enum(['approved', 'rejected']), reason: z.string().optional() }).parse(req.body); return resolveApproval((req.params as { approvalId: string }).approvalId, body.status, body.reason); });
  app.get('/cost-events', async () => listCostEvents());

  app.get('/credentials', async (req) => {
    const query = z.object({ providerName: z.enum(['runpod', 'github', 'supabase', 'huggingface', 'llama_runtime', 'qwen_runtime']).optional() }).parse(req.query);
    return listCredentials(query.providerName);
  });
  app.post('/credentials', async (req) => createCredential(z.object({
    providerName: z.enum(['runpod', 'github', 'supabase', 'huggingface', 'llama_runtime', 'qwen_runtime']),
    credentialLabel: z.string().min(2),
    value: z.string().min(8),
  }).parse(req.body)));
  app.post('/credentials/:credentialId/status', async (req) => updateCredentialStatus((req.params as { credentialId: string }).credentialId, z.object({ status: z.enum(['untested', 'valid', 'invalid', 'disabled']) }).parse(req.body).status));
  app.delete('/credentials/:credentialId', async (req) => deleteCredential((req.params as { credentialId: string }).credentialId, z.object({ approved: z.boolean() }).parse(req.body).approved));

  app.post('/feasibility/llama-405b', async (req) => checkLlama405BFeasibility(z.object({
    gpuCount: z.number(),
    gpuModel: z.string(),
    totalVramGb: z.number(),
    diskGb: z.number(),
    cudaAvailable: z.boolean(),
    dockerAvailable: z.boolean(),
    hfTokenPresent: z.boolean(),
    modelPathAvailable: z.boolean(),
    servingEngine: z.enum(['vllm', 'sglang', 'tensorrt-llm']),
  }).parse(req.body)));

  app.get('/runpod/test', async () => {
    const result = await testRunPodConnection();
    await writeAudit({ actorType: 'admin', action: 'runpod.test_connection', targetType: 'provider', targetId: 'runpod', status: 'ok' });
    return result;
  });
  app.get('/runpod/gpu-targets', async () => summarizeTargetGpus(await listRunPodGpuTypes()));
  app.get('/runpod/pods', listRunPodPods);
  app.post('/runpod/pods/:podId/start', async (req) => {
    const body = z.object({ estimatedHourlyCost: z.number().default(0), hours: z.number().default(4) }).parse(req.body ?? {});
    const gate = assertStartAllowed(body.estimatedHourlyCost, body.hours, { maxSessionHours: env.MAX_SESSION_HOURS });
    if (!gate.allowed) {
      await writeAudit({ actorType: 'admin', action: 'runpod.start_blocked', targetType: 'pod', targetId: (req.params as { podId: string }).podId, status: 'blocked', metadata: gate });
      return { ok: false, ...gate };
    }
    return startRunPodPod((req.params as { podId: string }).podId);
  });
  app.post('/runpod/pods/:podId/stop', async (req) => stopRunPodPod((req.params as { podId: string }).podId));

  app.get('/sessions', async () => listSessions());
  app.post('/sessions', async (req) => createSession(z.object({ sessionName: z.string().min(3), gpuType: z.string(), gpuCount: z.number().min(1), modelRole: z.enum(['business_reasoning', 'research', 'architecture', 'coding', 'qa', 'database', 'devops']).optional(), modelId: z.string().optional(), estimatedHourlyCost: z.number().optional(), maxHours: z.number().max(env.MAX_SESSION_HOURS).default(env.MAX_SESSION_HOURS), podId: z.string().optional(), endpointUrl: z.string().optional() }).parse(req.body)));
  app.post('/sessions/auto-stop/check', async () => checkAutoStop());
  app.post('/sessions/emergency-stop', async () => emergencyStopAll());
  app.post('/sessions/:sessionId/status', async (req) => updateSessionStatus((req.params as { sessionId: string }).sessionId, z.object({ status: z.enum(['pending', 'starting', 'running', 'stopping', 'stopped', 'failed']) }).parse(req.body).status));
  app.post('/sessions/:sessionId/stop', async (req) => manualStopSession((req.params as { sessionId: string }).sessionId));

  app.get('/tasks', async () => listTasks());
  app.post('/tasks', async (req) => createTask(taskSchema.parse(req.body)));
  app.get('/tasks/:taskId/logs', async (req) => listTaskLogs((req.params as { taskId: string }).taskId));
  app.post('/tasks/:taskId/status', async (req) => { const body = z.object({ status: z.enum(['queued', 'running', 'waiting_approval', 'completed', 'failed', 'cancelled']), outputSummary: z.string().optional() }).parse(req.body); return updateTaskStatus((req.params as { taskId: string }).taskId, body.status, body.outputSummary); });

  app.get('/audit-logs', async () => listAuditLogs());
  app.get('/github/test', testGitHubToken);
  app.get('/github/repos', listRepos);
  app.post('/chat', async (req) => {
    const body = z.object({ messages: z.array(z.object({ role: z.string(), content: z.string() })), temperature: z.number().optional(), max_tokens: z.number().optional(), modelRole: modelRoleSchema.default('auto'), taskType: z.string().default('business_strategy') }).parse(req.body);
    return chatWithPrivateModel(body.messages, body);
  });
}
