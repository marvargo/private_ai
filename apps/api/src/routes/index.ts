import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { checkLlama405BFeasibility } from '../services/feasibility.js';
import { listRunPodGpuTypes } from '../integrations/runpod.js';
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
import { createLlama405BPodTemplate, createQwenCoderPodTemplate, createRunPodPod, createSmallTestPodTemplate, deleteRunPodPod, emergencyStopAllActiveSessions, getRunPodPodLogs, getRunPodPodStatus, listRunPodPods, scheduleAutoStop, startRunPodPod, stopRunPodPod, testRunPodConnection } from '../services/runpodLifecycle.js';
import { getSettings, patchSettings } from '../services/settings.js';
import { getModelRuntimeLogs, getModelRuntimeStatus, pollModelRuntimes, restartModelRuntime, startModelRuntime, stopModelRuntime } from '../services/modelRuntimeHealth.js';

const modelRoleSchema = z.enum(['business_reasoning', 'research', 'architecture', 'coding', 'qa', 'database', 'devops', 'auto']);


const settingsPatchSchema = z.object({
  privacy: z.object({
    externalModelProvidersAllowed: z.boolean().optional(),
  }).optional(),
  runpod: z.object({
    defaultRegion: z.string().min(1).optional(),
    defaultGpuType: z.string().min(1).optional(),
    defaultGpuCount: z.number().int().min(1).max(16).optional(),
    defaultVolumeGb: z.number().int().min(100).optional(),
    defaultSessionHours: z.number().min(0.25).max(env.MAX_SESSION_HOURS).optional(),
    maxSessionHours: z.number().min(0.25).max(env.MAX_SESSION_HOURS).optional(),
    autoStopEnabled: z.boolean().optional(),
  }).optional(),
  budget: z.object({
    maxDailyGpuBudgetUsd: z.number().min(0).optional(),
  }).optional(),
  approvals: z.object({
    deletePodRequired: z.boolean().optional(),
    productionActionRequired: z.boolean().optional(),
    destructiveActionRequired: z.boolean().optional(),
    externalSharingRequired: z.boolean().optional(),
  }).optional(),
});

const credentialProviderSchema = z.enum(['runpod', 'github', 'supabase', 'huggingface']);
const credentialWriteSchema = z.object({ credentialLabel: z.string().min(2).default('default'), value: z.string().min(8) });

async function testProviderCredential(providerName: z.infer<typeof credentialProviderSchema>) {
  if (providerName === 'runpod') return testRunPodConnection();
  if (providerName === 'github') return testGitHubToken();
  if (providerName === 'supabase') return diagnoseSupabase();
  return checkRequiredModelAccess([env.MODEL_ID]);
}

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
  app.get('/settings', async () => getSettings());
  app.patch('/settings', async (req) => { const updated = patchSettings(settingsPatchSchema.parse(req.body ?? {})); await writeAudit({ actorType: 'admin', action: 'settings.updated', targetType: 'app_settings', status: 'ok' }); return updated; });
  app.get('/models', async () => listPersistentModelRegistry());
  app.get('/supabase/diagnostics', async () => diagnoseSupabase());
  app.get('/models/access-check', async () => checkRequiredModelAccess([...new Set((await listPersistentModelRegistry()).filter((model) => model.enabled).map((model) => model.modelName))]));
  app.post('/models/route-preview', async (req) => { const body = z.object({ taskType: z.string(), modelRole: modelRoleSchema.default('auto') }).parse(req.body); return selectModelForTask(body.taskType, body.modelRole); });

  app.get('/model/status', async () => getModelRuntimeStatus());
  app.post('/model/status/check', async () => pollModelRuntimes());
  app.post('/model/start', async (req) => {
    const body = z.object({ modelRole: z.enum(['business_reasoning', 'research', 'architecture', 'coding', 'qa', 'database', 'devops']), podId: z.string().optional() }).parse(req.body ?? {});
    return startModelRuntime(body.modelRole, body.podId);
  });
  app.post('/model/stop', async (req) => {
    const body = z.object({ modelRole: z.enum(['business_reasoning', 'research', 'architecture', 'coding', 'qa', 'database', 'devops']), podId: z.string().optional() }).parse(req.body ?? {});
    return stopModelRuntime(body.modelRole, body.podId);
  });
  app.post('/model/restart', async (req) => {
    const body = z.object({ modelRole: z.enum(['business_reasoning', 'research', 'architecture', 'coding', 'qa', 'database', 'devops']), podId: z.string().optional() }).parse(req.body ?? {});
    return restartModelRuntime(body.modelRole, body.podId);
  });
  app.get('/model/logs', async (req) => {
    const query = z.object({ modelRole: z.enum(['business_reasoning', 'research', 'architecture', 'coding', 'qa', 'database', 'devops']), podId: z.string().optional() }).parse(req.query);
    return getModelRuntimeLogs(query.modelRole, query.podId);
  });



  app.get('/approvals', async (req) => { const query = z.object({ status: z.enum(['pending', 'approved', 'rejected']).optional() }).parse(req.query); return listApprovals(query.status); });
  app.post('/approvals', async (req) => requestApproval(z.object({ approvalType: z.enum(['runpod_start', 'runpod_delete', 'credential_delete', 'production_action']), requestedAction: z.string(), riskLevel: z.enum(['low', 'medium', 'high', 'critical']), requestedBy: z.enum(['admin', 'system', 'worker']).default('admin'), reason: z.string().optional() }).parse(req.body)));
  app.post('/approvals/:approvalId/resolve', async (req) => { const body = z.object({ status: z.enum(['approved', 'rejected']), reason: z.string().optional() }).parse(req.body); return resolveApproval((req.params as { approvalId: string }).approvalId, body.status, body.reason); });
  app.get('/cost-events', async () => listCostEvents());

  app.get('/credentials/status', async () => listCredentials());
  app.get('/credentials', async (req) => {
    const query = z.object({ providerName: z.enum(['runpod', 'github', 'supabase', 'huggingface', 'llama_runtime', 'qwen_runtime']).optional() }).parse(req.query);
    return listCredentials(query.providerName);
  });
  app.post('/credentials', async (req) => createCredential(z.object({
    providerName: z.enum(['runpod', 'github', 'supabase', 'huggingface', 'llama_runtime', 'qwen_runtime']),
    credentialLabel: z.string().min(2),
    value: z.string().min(8),
  }).parse(req.body)));
  app.post('/credentials/:providerName', async (req) => { const providerName = credentialProviderSchema.parse((req.params as { providerName: string }).providerName); return createCredential({ providerName, ...credentialWriteSchema.parse(req.body) }); });
  app.post('/credentials/test/:providerName', async (req) => { const providerName = credentialProviderSchema.parse((req.params as { providerName: string }).providerName); const result = await testProviderCredential(providerName); await writeAudit({ actorType: 'admin', action: `credential.${providerName}.test`, targetType: 'provider_credential', targetId: providerName, status: 'ok' }); return result; });
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
  app.get('/runpod/pods', async () => listRunPodPods());
  app.post('/runpod/pods', async (req) => {
    const body = z.object({
      template: z.enum(['llama405b', 'qwen-coder', 'small-test']).default('small-test'),
      approved: z.boolean().default(false),
      estimatedHourlyCost: z.number().optional(),
      hours: z.number().default(env.DEFAULT_SESSION_HOURS),
    }).parse(req.body ?? {});
    const template = body.template === 'llama405b' ? createLlama405BPodTemplate() : body.template === 'qwen-coder' ? createQwenCoderPodTemplate() : createSmallTestPodTemplate();
    return createRunPodPod(template, { approved: body.approved, estimatedHourlyCost: body.estimatedHourlyCost, hours: body.hours });
  });
  app.get('/runpod/pods/:podId/status', async (req) => getRunPodPodStatus((req.params as { podId: string }).podId));
  app.get('/runpod/pods/:podId/logs', async (req) => getRunPodPodLogs((req.params as { podId: string }).podId));
  app.post('/runpod/pods/:podId/start', async (req) => {
    const body = z.object({ estimatedHourlyCost: z.number().default(0), hours: z.number().default(4) }).parse(req.body ?? {});
    return startRunPodPod((req.params as { podId: string }).podId, body);
  });
  app.post('/runpod/pods/:podId/stop', async (req) => stopRunPodPod((req.params as { podId: string }).podId));
  app.delete('/runpod/pods/:podId', async (req) => {
    const body = z.object({ approved: z.boolean().default(false) }).parse(req.body ?? {});
    return deleteRunPodPod((req.params as { podId: string }).podId, body.approved);
  });
  app.post('/runpod/sessions/:sessionId/auto-stop', async (req) => {
    const body = z.object({ hours: z.number().default(env.DEFAULT_SESSION_HOURS) }).parse(req.body ?? {});
    return scheduleAutoStop((req.params as { sessionId: string }).sessionId, body.hours);
  });
  app.post('/runpod/emergency-stop', async () => emergencyStopAllActiveSessions());

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
