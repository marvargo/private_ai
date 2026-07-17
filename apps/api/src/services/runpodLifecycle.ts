import { ConcreteModelRole } from '@wyndme/shared';
import { randomUUID } from 'node:crypto';
import { assertStartAllowed } from './costControls.js';
import { requestApproval } from './approvals.js';
import { createSession, listSessions, updateSessionStatus, writeAudit, writeCostEvent } from './orchestrator.js';
import { env } from '../utils/env.js';
import { updateModelRuntimeStatusByRoleFamily } from './modelRegistry.js';
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

function modelFamilyForSession(session: { modelId?: string; modelRole?: ConcreteModelRole }) {
  const modelId = session.modelId?.toLowerCase() ?? '';
  if (modelId.includes('tinyllama') || modelId.includes('small-test')) return 'test';
  if (modelId.includes('qwen')) return 'qwen';
  return modelFamilyForRole(session.modelRole ?? 'business_reasoning');
}

function modelFamilyForTemplate(template: RunPodPodTemplate) {
  return template.modelFamily ?? (template.name.includes('qwen') ? 'qwen' : template.name.includes('small-test') ? 'test' : 'llama');
}

function defaultRoleForTemplate(template: RunPodPodTemplate): ConcreteModelRole {
  return template.modelRole ?? (template.name.includes('qwen') ? 'coding' : template.name.includes('small-test') ? 'qa' : 'business_reasoning');
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
  const modelId = process.env.LLAMA_MODEL_ID || 'meta-llama/Meta-Llama-3.1-405B-Instruct';
  const servedModelName = process.env.LLAMA_SERVED_MODEL_NAME || 'wyndme-llama-405b';
  const tensorParallelSize = process.env.LLAMA_TENSOR_PARALLEL_SIZE || '8';
  const maxModelLen = process.env.LLAMA_CONTEXT_LENGTH || '32768';
  const port = Number(process.env.RUNPOD_LLAMA_PORT || 8000);
  const diagnosticsPort = Number(process.env.RUNPOD_LLAMA_DIAGNOSTICS_PORT || 8002);
  const image = process.env.RUNPOD_LLAMA_CONTAINER_IMAGE
    || process.env.RUNPOD_DEFAULT_CONTAINER_IMAGE
    || 'ghcr.io/marvargo/llama405b-vllm:latest';
  const startCommand = process.env.RUNPOD_LLAMA_START_COMMAND
    || (image.includes('vllm/vllm-openai')
      ? `--model ${modelId} --served-model-name ${servedModelName} --host 0.0.0.0 --port ${port} --tensor-parallel-size ${tensorParallelSize} --max-model-len ${maxModelLen} --gpu-memory-utilization ${process.env.LLAMA_GPU_MEMORY_UTILIZATION || '0.88'} --trust-remote-code`
      : '/opt/wyndme/supervisor.py');

  return {
    name: 'wyndme-llama-405b-vllm',
    modelFamily: 'llama',
    gpuCount: Number(process.env.RUNPOD_LLAMA_GPU_COUNT || 8),
    gpuType: process.env.RUNPOD_LLAMA_GPU_TYPE || env.RUNPOD_DEFAULT_GPU_TYPE,
    volumeGb: Number(process.env.RUNPOD_LLAMA_VOLUME_GB || env.RUNPOD_DEFAULT_VOLUME_GB || 2000),
    containerImage: image,
    containerRegistryAuthId: process.env.RUNPOD_LLAMA_CONTAINER_REGISTRY_AUTH_ID || process.env.RUNPOD_GHCR_REGISTRY_AUTH_ID,
    ports: [
      { containerPort: port, protocol: 'http' },
      { containerPort: diagnosticsPort, protocol: 'http' },
    ],
    env: {
      MODEL_ID: modelId,
      SERVED_MODEL_NAME: servedModelName,
      MODEL_QUANTIZATION: process.env.LLAMA_MODEL_QUANTIZATION || 'fp8',
      TENSOR_PARALLEL_SIZE: tensorParallelSize,
      MAX_MODEL_LEN: maxModelLen,
      GPU_MEMORY_UTILIZATION: process.env.LLAMA_GPU_MEMORY_UTILIZATION || '0.88',
      PORT: String(port),
      DIAGNOSTICS_PORT: String(diagnosticsPort),
      ...(process.env.HF_TOKEN ? { HF_TOKEN: process.env.HF_TOKEN, HUGGING_FACE_HUB_TOKEN: process.env.HF_TOKEN } : {}),
    },
    volumeMountPath: '/workspace/models',
    startCommand,
    healthcheck: '/opt/wyndme/healthcheck.sh',
    estimatedHourlyCost: Number(process.env.LLAMA_ESTIMATED_HOURLY_USD || 21.52),
    modelRole: 'business_reasoning',
  };
}

export function createQwenCoderPodTemplate(): RunPodPodTemplate {
  const modelId = process.env.QWEN_CODER_MODEL_ID || 'Qwen/Qwen2.5-Coder-7B-Instruct';
  const servedModelName = process.env.QWEN_SERVED_MODEL_NAME || 'wyndme-qwen-coder';
  const tensorParallelSize = process.env.QWEN_TENSOR_PARALLEL_SIZE || '1';
  const maxModelLen = process.env.QWEN_CONTEXT_LENGTH || '8192';
  const port = Number(process.env.RUNPOD_QWEN_PORT || 8001);
  const diagnosticsPort = Number(process.env.RUNPOD_QWEN_DIAGNOSTICS_PORT || 8002);
  const image = process.env.RUNPOD_QWEN_CONTAINER_IMAGE || 'ghcr.io/marvargo/qwen-coder-vllm:latest';
  const startCommand = process.env.RUNPOD_QWEN_START_COMMAND
    || (image.includes('vllm/vllm-openai')
      ? `--model ${modelId} --served-model-name ${servedModelName} --host 0.0.0.0 --port ${port} --tensor-parallel-size ${tensorParallelSize} --max-model-len ${maxModelLen} --gpu-memory-utilization ${process.env.QWEN_GPU_MEMORY_UTILIZATION || '0.85'} --trust-remote-code`
      : '/opt/wyndme/supervisor.py');

  return {
    name: 'wyndme-qwen-coder-vllm',
    modelFamily: 'qwen',
    gpuCount: Number(process.env.RUNPOD_QWEN_GPU_COUNT || 1),
    gpuType: env.RUNPOD_DEFAULT_GPU_TYPE,
    volumeGb: Number(process.env.RUNPOD_QWEN_VOLUME_GB || 150),
    containerImage: image,
    containerRegistryAuthId: process.env.RUNPOD_QWEN_CONTAINER_REGISTRY_AUTH_ID || process.env.RUNPOD_GHCR_REGISTRY_AUTH_ID,
    ports: [
      { containerPort: port, protocol: 'http' },
      { containerPort: diagnosticsPort, protocol: 'http' },
    ],
    env: {
      MODEL_ID: modelId,
      SERVED_MODEL_NAME: servedModelName,
      TENSOR_PARALLEL_SIZE: tensorParallelSize,
      MAX_MODEL_LEN: maxModelLen,
      GPU_MEMORY_UTILIZATION: process.env.QWEN_GPU_MEMORY_UTILIZATION || '0.85',
      PORT: String(port),
      DIAGNOSTICS_PORT: String(diagnosticsPort),
      ...(process.env.HF_TOKEN ? { HF_TOKEN: process.env.HF_TOKEN, HUGGING_FACE_HUB_TOKEN: process.env.HF_TOKEN } : {}),
    },
    volumeMountPath: '/workspace/models',
    startCommand,
    healthcheck: '/opt/wyndme/healthcheck.sh',
    estimatedHourlyCost: Number(process.env.QWEN_ESTIMATED_HOURLY_USD || 2.69),
    modelRole: 'coding',
  };
}

export function createSmallTestPodTemplate(): RunPodPodTemplate {
  const mode = process.env.RUNPOD_SMALL_TEST_MODE || 'real';

  if (mode === 'mock') {
    return {
      name: 'wyndme-small-test-mock',
      modelFamily: 'test',
      gpuCount: 1,
      gpuType: process.env.RUNPOD_SMALL_TEST_GPU_TYPE || env.RUNPOD_DEFAULT_GPU_TYPE,
      volumeGb: 20,
      containerImage: process.env.RUNPOD_SMALL_TEST_MOCK_IMAGE || 'ghcr.io/marvargo/private-ai-smalltest-mock:latest',
      containerRegistryAuthId: process.env.RUNPOD_SMALL_TEST_CONTAINER_REGISTRY_AUTH_ID || process.env.RUNPOD_GHCR_REGISTRY_AUTH_ID,
      ports: [{ containerPort: 3000, protocol: 'http' }],
      env: {
        SERVED_MODEL_NAME: 'mock-gpt-thinking',
      },
      volumeMountPath: '/workspace',
      startCommand: '',
      healthcheck: '/health',
      estimatedHourlyCost: 0.5,
      modelRole: 'qa',
    };
  }

  if (mode === 'vllm') {
    return {
      name: 'wyndme-small-test-vllm',
      modelFamily: 'test',
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

  return {
    name: 'wyndme-small-test-real',
    modelFamily: 'test',
    gpuCount: 1,
    gpuType: process.env.RUNPOD_SMALL_TEST_GPU_TYPE || env.RUNPOD_DEFAULT_GPU_TYPE,
    volumeGb: 80,
    containerImage: process.env.RUNPOD_SMALL_TEST_REAL_IMAGE || 'ghcr.io/marvargo/private-ai-smalltest-real:latest',
    containerRegistryAuthId: process.env.RUNPOD_SMALL_TEST_CONTAINER_REGISTRY_AUTH_ID || process.env.RUNPOD_GHCR_REGISTRY_AUTH_ID,
    ports: [{ containerPort: 8000, protocol: 'http' }],
    env: {
      MODEL_ID: process.env.RUNPOD_SMALL_TEST_MODEL_ID || 'TinyLlama/TinyLlama-1.1B-Chat-v1.0',
      SERVED_MODEL_NAME: 'wyndme-small-test-real',
      HF_HOME: '/workspace/models',
      TRANSFORMERS_CACHE: '/workspace/models',
    },
    volumeMountPath: '/workspace/models',
    startCommand: '',
    healthcheck: '/health',
    estimatedHourlyCost: 0.5,
    modelRole: 'qa',
  };
}

async function persistRuntime(session: Awaited<ReturnType<typeof createSession>>, pod: RunPodPodStatus, status: 'starting' | 'healthy' | 'stopped' | 'failed', template: RunPodPodTemplate) {
  const modelFamily = modelFamilyForTemplate(template);
  if (!isSupabaseConfigured()) return;
  try {
    const id = stripPrefix(session.id);
    await getSupabaseAdminClient().from('model_runtimes').upsert({
      id,
      session_id: id,
      model_id: session.modelId,
      model_role: session.modelRole,
      model_provider: 'runpod',
      model_family: modelFamily,
      gpu_provider: 'runpod',
      gpu_profile: `${session.gpuCount}x ${session.gpuType ?? pod.gpuType ?? 'RunPod GPU'}`,
      cost_estimate_hourly_usd: session.estimatedHourlyCost,
      serving_engine: 'vllm',
      status,
      health_url: session.endpointUrl ? `${session.endpointUrl.replace(/\/$/, '')}/health` : undefined,
      api_base_url: session.endpointUrl,
      context_length: modelFamily === 'qwen' ? 262144 : modelFamily === 'test' ? 4096 : 32768,
      quantization: modelFamily === 'test' ? undefined : 'fp8',
      tensor_parallel_size: session.gpuCount,
      pipeline_parallel_size: 1,
      last_health_check_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    await getSupabaseAdminClient()
      .from('model_registry')
      .update({ status, model_endpoint_url: session.endpointUrl, updated_at: new Date().toISOString() })
      .eq('model_role', session.modelRole)
      .eq('model_family', modelFamily);
  } catch (error) {
    await writeAudit({ actorType: 'system', action: 'runpod.runtime_persist_failed', targetType: 'model_runtime', targetId: session.id, status: 'failed', metadata: { message: error instanceof Error ? error.message : String(error) } });
  }
}

async function persistModelRegistryStatus(modelRole: ConcreteModelRole, modelFamily: 'llama' | 'qwen' | 'test' | 'future', status: 'starting' | 'healthy' | 'stopped' | 'failed', endpointUrl?: string) {
  try {
    updateModelRuntimeStatusByRoleFamily(modelRole, modelFamily, status, endpointUrl);
  } catch {
    // Supabase may still have the model registry row even when the in-memory registry does not.
  }

  if (!isSupabaseConfigured()) return;
  await getSupabaseAdminClient()
    .from('model_registry')
    .update({ status, model_endpoint_url: endpointUrl, updated_at: new Date().toISOString() })
    .eq('model_role', modelRole)
    .eq('model_family', modelFamily);
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

  if (modelFamilyForTemplate(template) === 'llama' && !input.approved) {
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
  const runtimeStatus = runtimeStatusFromPod(pod.runtimeStatus);
  try {
    updateModelRuntimeStatusByRoleFamily(modelRole, modelFamilyForTemplate(template), runtimeStatus, pod.endpointUrl);
  } catch (error) {
    await writeAudit({ actorType: 'system', action: 'runpod.in_memory_registry_update_failed', targetType: 'model_registry', targetId: `${modelFamilyForTemplate(template)}/${modelRole}`, status: 'failed', metadata: { message: error instanceof Error ? error.message : String(error) } });
  }
  await persistRuntime(session, pod, runtimeStatus, template);
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
  if (session) {
    await updateSessionStatus(session.id, 'stopped');
    await writeCostEvent({ sessionId: session.id, provider: 'runpod', resourceType: 'runpod_pod', gpuType: session.gpuType, gpuCount: session.gpuCount, estimatedHourlyCost: session.estimatedHourlyCost, eventType: 'runpod.stop' });
    await persistModelRegistryStatus(session.modelRole ?? 'business_reasoning', modelFamilyForSession(session), 'stopped');
  }
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
  if (session) {
    await updateSessionStatus(session.id, 'stopped');
    await writeCostEvent({ sessionId: session.id, provider: 'runpod', resourceType: 'runpod_pod', gpuType: session.gpuType, gpuCount: session.gpuCount, estimatedHourlyCost: session.estimatedHourlyCost, eventType: 'runpod.delete' });
    await persistModelRegistryStatus(session.modelRole ?? 'business_reasoning', modelFamilyForSession(session), 'stopped');
  }
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
