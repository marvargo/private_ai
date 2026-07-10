import { ConcreteModelRole } from '@wyndme/shared';
import { randomUUID } from 'node:crypto';
import { assertStartAllowed } from './costControls.js';
import { requestApproval } from './approvals.js';
import { createSession, listSessions, updateSessionStatus, writeAudit, writeCostEvent } from './orchestrator.js';
import { env } from '../utils/env.js';
import { getSupabaseAdminClient, isSupabaseConfigured } from '../repositories/supabaseClient.js';
import {
  RunPodPodStatus,
  RunPodPodTemplate,
  createRunPodPod as providerCreateRunPodPod,
  deleteRunPodPod as providerDeleteRunPodPod,
  getRunPodPodLogs as providerGetRunPodPodLogs,
  getRunPodPodStatus as providerGetRunPodPodStatus,
  listRunPodPods as providerListRunPodPods,
  startRunPodPod as providerStartRunPodPod,
  stopRunPodPod as providerStopRunPodPod,
  testRunPodConnection,
} from '../integrations/runpod.js';

export { testRunPodConnection };

export interface RunPodLifecycleProviders {
  listRunPodPods?: typeof providerListRunPodPods;
  createRunPodPod?: typeof providerCreateRunPodPod;
  startRunPodPod?: typeof providerStartRunPodPod;
  stopRunPodPod?: typeof providerStopRunPodPod;
  deleteRunPodPod?: typeof providerDeleteRunPodPod;
  getRunPodPodStatus?: typeof providerGetRunPodPodStatus;
  getRunPodPodLogs?: typeof providerGetRunPodPodLogs;
}

export interface StartPolicyInput {
  approved?: boolean;
  estimatedHourlyCost?: number;
  hours?: number;
  modelRole?: ConcreteModelRole;
}

function stripPrefix(id: string) {
  return id.replace(/^(session|runtime)_/, '');
}

function modelFamilyForRole(role: ConcreteModelRole) {
  return ['coding', 'qa', 'database', 'devops'].includes(role) ? 'qwen' : 'llama';
}

function defaultRoleForTemplate(template: RunPodPodTemplate): ConcreteModelRole {
  return template.modelRole ?? (template.name.includes('qwen') ? 'coding' : 'business_reasoning');
}

function runtimeStatusFromPod(status?: string): 'starting' | 'healthy' | 'stopped' | 'failed' {
  if (!status) return 'starting';
  const normalized = status.toLowerCase();
  if (normalized.includes('running')) return 'healthy';
  if (normalized.includes('stop') || normalized.includes('exit')) return 'stopped';
  if (normalized.includes('fail') || normalized.includes('error')) return 'failed';
  return 'starting';
}

export function createLlama405BPodTemplate(): RunPodPodTemplate {
  return {
    name: 'wyndme-llama-405b-vllm',
    gpuCount: 8,
    gpuType: env.RUNPOD_DEFAULT_GPU_TYPE,
    volumeGb: env.RUNPOD_DEFAULT_VOLUME_GB,
    containerImage: process.env.RUNPOD_DEFAULT_CONTAINER_IMAGE || 'ghcr.io/wyndme/llama405b-vllm:latest',
    ports: [{ containerPort: 8000, protocol: 'http' }],
    env: {
      MODEL_ID: 'meta-llama/Meta-Llama-3.1-405B-Instruct',
      MODEL_QUANTIZATION: 'fp8',
      TENSOR_PARALLEL_SIZE: '8',
      MAX_MODEL_LEN: '32768',
      GPU_MEMORY_UTILIZATION: '0.90',
    },
    volumeMountPath: '/workspace/models',
    startCommand: '/opt/wyndme/start-vllm.sh',
    healthcheck: '/opt/wyndme/healthcheck.sh',
    estimatedHourlyCost: 21.52,
    modelRole: 'business_reasoning',
  };
}

export function createQwenCoderPodTemplate(): RunPodPodTemplate {
  return {
    name: 'wyndme-qwen-coder-vllm',
    gpuCount: 4,
    gpuType: env.RUNPOD_DEFAULT_GPU_TYPE,
    volumeGb: 1000,
    containerImage: 'ghcr.io/wyndme/qwen-coder-vllm:latest',
    ports: [{ containerPort: 8001, protocol: 'http' }],
    env: {
      MODEL_ID: 'Qwen/Qwen3-Coder-480B-A35B-Instruct-FP8',
      SERVED_MODEL_NAME: 'wyndme-qwen-coder',
      TENSOR_PARALLEL_SIZE: '4',
      MAX_MODEL_LEN: '262144',
      GPU_MEMORY_UTILIZATION: '0.90',
    },
    volumeMountPath: '/workspace/models',
    startCommand: '/opt/wyndme/start-qwen-vllm.sh',
    healthcheck: '/opt/wyndme/healthcheck.sh',
    estimatedHourlyCost: 10.76,
    modelRole: 'coding',
  };
}

export function createSmallTestPodTemplate(): RunPodPodTemplate {
  return {
    name: 'wyndme-small-test-vllm',
    gpuCount: 1,
    gpuType: process.env.RUNPOD_SMALL_TEST_GPU_TYPE || env.RUNPOD_DEFAULT_GPU_TYPE,
    volumeGb: 80,
    containerImage: process.env.RUNPOD_SMALL_TEST_IMAGE || 'vllm/vllm-openai:latest',
    ports: [{ containerPort: 8000, protocol: 'http' }],
    env: {
      MODEL_ID: 'TinyLlama/TinyLlama-1.1B-Chat-v1.0',
      SERVED_MODEL_NAME: 'wyndme-small-test',
      TENSOR_PARALLEL_SIZE: '1',
      MAX_MODEL_LEN: '4096',
    },
    volumeMountPath: '/workspace/models',
    startCommand: '--model TinyLlama/TinyLlama-1.1B-Chat-v1.0 --served-model-name wyndme-small-test --host 0.0.0.0 --port 8000 --max-model-len 4096',
    healthcheck: '/v1/models',
    estimatedHourlyCost: 0.5,
    modelRole: 'qa',
  };
}

async function persistRuntime(session: Awaited<ReturnType<typeof createSession>>, pod: RunPodPodStatus, status: 'starting' | 'healthy' | 'stopped' | 'failed') {
  if (!isSupabaseConfigured()) return;
  try {
    const id = stripPrefix(session.id);
    await getSupabaseAdminClient().from('model_runtimes').upsert({
      id,
      session_id: id,
      model_id: session.modelId,
      model_role: session.modelRole,
      model_provider: 'runpod',
      model_family: modelFamilyForRole(session.modelRole),
      gpu_provider: 'runpod',
      gpu_profile: `${session.gpuCount}x ${session.gpuType ?? pod.gpuType ?? 'RunPod GPU'}`,
      cost_estimate_hourly_usd: session.estimatedHourlyCost,
      serving_engine: 'vllm',
      status,
      health_url: session.endpointUrl ? `${session.endpointUrl.replace(/\/$/, '')}/health` : undefined,
      api_base_url: session.endpointUrl,
      context_length: modelFamilyForRole(session.modelRole) === 'qwen' ? 262144 : 32768,
      quantization: modelFamilyForRole(session.modelRole) === 'qwen' ? 'fp8' : 'fp8',
      tensor_parallel_size: session.gpuCount,
      pipeline_parallel_size: 1,
      last_health_check_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    await getSupabaseAdminClient()
      .from('model_registry')
      .update({ status, model_endpoint_url: session.endpointUrl, updated_at: new Date().toISOString() })
      .eq('model_role', session.modelRole);
  } catch (error) {
    await writeAudit({ actorType: 'system', action: 'runpod.runtime_persist_failed', targetType: 'model_runtime', targetId: session.id, status: 'failed', metadata: { message: error instanceof Error ? error.message : String(error) } });
  }
}

export async function listRunPodPods(providers: RunPodLifecycleProviders = {}) {
  return (providers.listRunPodPods ?? providerListRunPodPods)();
}

export async function getRunPodPodStatus(podId: string, providers: RunPodLifecycleProviders = {}) {
  const status = await (providers.getRunPodPodStatus ?? providerGetRunPodPodStatus)(podId);
  await writeAudit({ actorType: 'admin', action: 'runpod.pod_status', targetType: 'pod', targetId: podId, status: 'ok', metadata: status as unknown as Record<string, unknown> });
  return status;
}

export async function getRunPodPodLogs(podId: string, providers: RunPodLifecycleProviders = {}) {
  const logs = await (providers.getRunPodPodLogs ?? providerGetRunPodPodLogs)(podId);
  await writeAudit({ actorType: 'admin', action: 'runpod.pod_logs', targetType: 'pod', targetId: podId, status: logs.supported ? 'ok' : 'blocked', metadata: { supported: logs.supported } });
  return logs;
}

export async function createRunPodPod(template: RunPodPodTemplate, input: StartPolicyInput = {}, providers: RunPodLifecycleProviders = {}) {
  const hours = input.hours ?? env.DEFAULT_SESSION_HOURS;
  const estimatedHourlyCost = input.estimatedHourlyCost ?? template.estimatedHourlyCost ?? 0;
  const modelRole = input.modelRole ?? defaultRoleForTemplate(template);
  const gate = assertStartAllowed(estimatedHourlyCost, hours, { maxSessionHours: env.MAX_SESSION_HOURS, maxDailyBudgetUsd: env.MAX_DAILY_GPU_BUDGET_USD });
  if (!gate.allowed) {
    await writeAudit({ actorType: 'admin', action: 'runpod.create_blocked_budget', targetType: 'pod_template', targetId: template.name, status: 'blocked', metadata: gate });
    return { ok: false, reason: gate.reason, approval: undefined };
  }

  if (modelFamilyForRole(modelRole) === 'llama' && !input.approved) {
    const approval = await requestApproval({ approvalType: 'runpod_start', requestedAction: `Start ${template.name}`, riskLevel: 'high', requestedBy: 'admin', reason: 'Llama 405B RunPod sessions are cost-impacting and require approval.' });
    await writeAudit({ actorType: 'admin', action: 'runpod.create_waiting_approval', targetType: 'pod_template', targetId: template.name, status: 'blocked', metadata: { approvalId: approval.id } });
    return { ok: false, reason: 'Approval required before starting Llama 405B RunPod session', approval };
  }

  const pod = await (providers.createRunPodPod ?? providerCreateRunPodPod)(template);
  const session = await createSession({
    sessionName: template.name,
    gpuType: template.gpuType,
    gpuCount: template.gpuCount,
    modelRole,
    modelId: template.env.MODEL_ID,
    estimatedHourlyCost,
    maxHours: hours,
    podId: pod.id,
    endpointUrl: pod.endpointUrl,
  });
  await updateSessionStatus(session.id, runtimeStatusFromPod(pod.runtimeStatus) === 'healthy' ? 'running' : 'starting');
  await writeCostEvent({ sessionId: session.id, provider: 'runpod', resourceType: 'runpod_pod', gpuType: template.gpuType, gpuCount: template.gpuCount, estimatedHourlyCost, estimatedTotalCost: estimatedHourlyCost * hours, eventType: 'runpod.create' });
  await writeAudit({ actorType: 'admin', action: 'runpod.pod_created', targetType: 'pod', targetId: pod.id, status: 'ok', metadata: { template: template.name, endpointUrl: pod.endpointUrl, autoStopAt: session.autoStopAt } });
  await persistRuntime(session, pod, runtimeStatusFromPod(pod.runtimeStatus));
  return { ok: true, pod, session, autoStopAt: session.autoStopAt };
}

export async function startRunPodPod(podId: string, input: StartPolicyInput = {}, providers: RunPodLifecycleProviders = {}) {
  const hours = input.hours ?? env.DEFAULT_SESSION_HOURS;
  const estimatedHourlyCost = input.estimatedHourlyCost ?? 0;
  const gate = assertStartAllowed(estimatedHourlyCost, hours, { maxSessionHours: env.MAX_SESSION_HOURS, maxDailyBudgetUsd: env.MAX_DAILY_GPU_BUDGET_USD });
  if (!gate.allowed) {
    await writeAudit({ actorType: 'admin', action: 'runpod.start_blocked_budget', targetType: 'pod', targetId: podId, status: 'blocked', metadata: gate });
    return { ok: false, reason: gate.reason };
  }
  const pod = await (providers.startRunPodPod ?? providerStartRunPodPod)(podId);
  await writeAudit({ actorType: 'admin', action: 'runpod.pod_started', targetType: 'pod', targetId: podId, status: 'ok', metadata: pod as unknown as Record<string, unknown> });
  return { ok: true, pod };
}

export async function stopRunPodPod(podId: string, providers: RunPodLifecycleProviders = {}) {
  const pod = await (providers.stopRunPodPod ?? providerStopRunPodPod)(podId);
  const sessions = await listSessions();
  const session = sessions.find((item) => item.podId === podId);
  if (session) await updateSessionStatus(session.id, 'stopped');
  await writeAudit({ actorType: 'admin', action: 'runpod.pod_stopped', targetType: 'pod', targetId: podId, status: 'ok', metadata: pod as unknown as Record<string, unknown> });
  return { ok: true, pod };
}

export async function deleteRunPodPod(podId: string, approved = false, providers: RunPodLifecycleProviders = {}) {
  if (!approved) {
    const approval = await requestApproval({ approvalType: 'runpod_delete', requestedAction: `Delete RunPod pod ${podId}`, riskLevel: 'critical', requestedBy: 'admin', reason: 'Deleting a pod is destructive and requires approval.' });
    await writeAudit({ actorType: 'admin', action: 'runpod.delete_waiting_approval', targetType: 'pod', targetId: podId, status: 'blocked', metadata: { approvalId: approval.id } });
    return { ok: false, reason: 'Approval required before deleting RunPod pod', approval };
  }
  const result = await (providers.deleteRunPodPod ?? providerDeleteRunPodPod)(podId, true);
  const sessions = await listSessions();
  const session = sessions.find((item) => item.podId === podId);
  if (session) await updateSessionStatus(session.id, 'stopped');
  await writeAudit({ actorType: 'admin', action: 'runpod.pod_deleted', targetType: 'pod', targetId: podId, status: 'ok' });
  return { ok: true, result };
}

export async function scheduleAutoStop(sessionId: string, hours = env.DEFAULT_SESSION_HOURS) {
  const sessions = await listSessions();
  const session = sessions.find((item) => item.id === sessionId);
  if (!session) throw new Error(`Session ${sessionId} not found`);
  const autoStopAt = session.autoStopAt ?? new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
  await writeAudit({ actorType: 'system', action: 'runpod.auto_stop_scheduled', targetType: 'ai_session', targetId: sessionId, status: 'ok', metadata: { autoStopAt, hours } });
  return { sessionId, autoStopAt, hours };
}

export async function emergencyStopAllActiveSessions(providers: RunPodLifecycleProviders = {}) {
  const sessions = await listSessions();
  const active = sessions.filter((session) => ['pending', 'starting', 'running'].includes(session.status));
  const results = [];
  for (const session of active) {
    if (session.podId) {
      try {
        await (providers.stopRunPodPod ?? providerStopRunPodPod)(session.podId);
      } catch (error) {
        await writeAudit({ actorType: 'system', action: 'runpod.emergency_stop_failed', targetType: 'pod', targetId: session.podId, status: 'failed', metadata: { message: error instanceof Error ? error.message : String(error) } });
      }
    }
    await updateSessionStatus(session.id, 'stopped');
    await writeCostEvent({ sessionId: session.id, provider: 'runpod', resourceType: 'runpod_pod', gpuType: session.gpuType, gpuCount: session.gpuCount, estimatedHourlyCost: session.estimatedHourlyCost, eventType: 'emergency_stop' });
    results.push({ sessionId: session.id, podId: session.podId, stopped: true });
  }
  const operationId = `emergency_${randomUUID()}`;
  await writeAudit({ actorType: 'admin', action: 'runpod.emergency_stop_all', targetType: 'runpod_operation', targetId: operationId, status: 'ok', metadata: { stoppedCount: results.length } });
  return { stoppedCount: results.length, results };
}
