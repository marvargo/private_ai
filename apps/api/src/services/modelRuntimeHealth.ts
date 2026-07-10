import { ConcreteModelRole, ModelRegistryEntry, ModelRole } from '@wyndme/shared';
import { getSupabaseAdminClient, isSupabaseConfigured } from '../repositories/supabaseClient.js';
import { getRunPodPodLogs, startRunPodPod, stopRunPodPod } from './runpodLifecycle.js';
import { listSessions, writeAudit } from './orchestrator.js';
import { listModelRegistry, selectModelForTask, updateModelRuntimeStatus } from './modelRegistry.js';

export interface RuntimeHealthResult {
  modelId: string;
  modelRole: ConcreteModelRole;
  modelFamily: ModelRegistryEntry['modelFamily'];
  endpointUrl?: string;
  status: ModelRegistryEntry['status'];
  checkedAt: string;
  detail?: string;
}

export interface HealthFetchResponse {
  ok: boolean;
  status: number;
  json?: () => Promise<unknown>;
  text?: () => Promise<string>;
}

export interface RuntimeHealthProviders {
  fetch?: (url: string, init?: RequestInit) => Promise<HealthFetchResponse>;
}

const healthHistory: RuntimeHealthResult[] = [];

function stripPrefix(id: string) {
  return id.replace(/^(runtime|session)_/, '');
}

function configuredEndpoint(model: ModelRegistryEntry) {
  if (model.endpointUrl) return model.endpointUrl;
  if (model.modelFamily === 'qwen') return process.env.QWEN_SERVER_URL;
  if (model.modelFamily === 'test') return process.env.TEST_MODEL_SERVER_URL;
  return process.env.LLAMA_SERVER_URL;
}

function apiKeyFor(model: ModelRegistryEntry) {
  if (model.modelFamily === 'qwen') return process.env.QWEN_SERVER_API_KEY;
  if (model.modelFamily === 'test') return process.env.TEST_MODEL_SERVER_API_KEY;
  return process.env.LLAMA_SERVER_API_KEY;
}

async function persistRuntimeHealth(model: ModelRegistryEntry, result: RuntimeHealthResult) {
  if (!isSupabaseConfigured()) return;
  try {
    await getSupabaseAdminClient().from('model_registry').update({
      status: result.status,
      model_endpoint_url: result.endpointUrl,
      updated_at: result.checkedAt,
    }).eq('id', model.id);

    await getSupabaseAdminClient().from('model_runtimes').upsert({
      id: stripPrefix(model.id).slice(0, 36),
      model_registry_id: model.id,
      model_id: model.modelName,
      model_role: model.modelRole,
      model_provider: model.modelProvider,
      model_family: model.modelFamily,
      gpu_provider: 'runpod',
      gpu_profile: model.gpuProfile,
      cost_estimate_hourly_usd: model.costEstimateHourlyUsd,
      serving_engine: model.servingEngine,
      status: result.status,
      health_url: result.endpointUrl ? `${result.endpointUrl.replace(/\/$/, '')}/health` : undefined,
      api_base_url: result.endpointUrl,
      context_length: model.contextLength,
      tensor_parallel_size: model.modelFamily === 'qwen' ? 4 : model.modelFamily === 'test' ? 1 : 8,
      pipeline_parallel_size: 1,
      last_health_check_at: result.checkedAt,
      updated_at: result.checkedAt,
    });
  } catch (error) {
    await writeAudit({ actorType: 'system', action: 'model_runtime.persist_failed', targetType: 'model_runtime', targetId: model.id, status: 'failed', metadata: { message: error instanceof Error ? error.message : String(error) } });
  }
}

export async function checkModelRuntime(model: ModelRegistryEntry, providers: RuntimeHealthProviders = {}): Promise<RuntimeHealthResult> {
  const endpointUrl = configuredEndpoint(model);
  const checkedAt = new Date().toISOString();
  if (!endpointUrl) {
    const result = { modelId: model.id, modelRole: model.modelRole, modelFamily: model.modelFamily, status: 'not_configured' as const, checkedAt, detail: 'No private endpoint configured' };
    healthHistory.unshift(result);
    updateModelRuntimeStatus(model.id, result.status);
    await persistRuntimeHealth(model, result);
    return result;
  }

  const fetcher = providers.fetch ?? fetch;
  const headers = apiKeyFor(model) ? { authorization: `Bearer ${apiKeyFor(model)}` } : undefined;
  const base = endpointUrl.replace(/\/$/, '');
  let result: RuntimeHealthResult;
  try {
    const modelsResponse = await fetcher(`${base}/v1/models`, { headers });
    if (modelsResponse.ok) {
      result = { modelId: model.id, modelRole: model.modelRole, modelFamily: model.modelFamily, endpointUrl, status: 'healthy', checkedAt, detail: `/v1/models HTTP ${modelsResponse.status}` };
    } else {
      const healthResponse = await fetcher(`${base}/health`, { headers });
      result = { modelId: model.id, modelRole: model.modelRole, modelFamily: model.modelFamily, endpointUrl, status: healthResponse.ok ? 'healthy' : 'unhealthy', checkedAt, detail: `/health HTTP ${healthResponse.status}` };
    }
  } catch (error) {
    result = { modelId: model.id, modelRole: model.modelRole, modelFamily: model.modelFamily, endpointUrl, status: 'unhealthy', checkedAt, detail: error instanceof Error ? error.message : String(error) };
  }

  healthHistory.unshift(result);
  updateModelRuntimeStatus(model.id, result.status, endpointUrl);
  await persistRuntimeHealth(model, result);
  await writeAudit({ actorType: 'system', action: 'model_runtime.health_check', targetType: 'model_runtime', targetId: model.id, status: result.status === 'healthy' ? 'ok' : 'failed', metadata: result as unknown as Record<string, unknown> });
  return result;
}

export async function pollModelRuntimes(providers: RuntimeHealthProviders = {}) {
  const results = [];
  for (const model of listModelRegistry().filter((entry) => entry.enabled)) {
    results.push(await checkModelRuntime(model, providers));
  }
  return { checkedAt: new Date().toISOString(), results };
}

export async function getModelRuntimeStatus() {
  return { models: listModelRegistry(), healthHistory: healthHistory.slice(0, 100) };
}

function findActiveSessionForRole(role: ConcreteModelRole) {
  return listSessions().then((sessions) => sessions.find((session) => session.modelRole === role && session.podId && ['pending', 'starting', 'running'].includes(session.status)));
}

export async function startModelRuntime(role: ConcreteModelRole, podId?: string) {
  const session = podId ? undefined : await findActiveSessionForRole(role);
  const targetPodId = podId ?? session?.podId;
  if (!targetPodId) return { ok: false, reason: `No active pod found for ${role}` };
  const result = await startRunPodPod(targetPodId, { modelRole: role });
  await writeAudit({ actorType: 'admin', action: 'model_runtime.start', targetType: 'pod', targetId: targetPodId, status: result.ok ? 'ok' : 'blocked' });
  return result;
}

export async function stopModelRuntime(role: ConcreteModelRole, podId?: string) {
  const session = podId ? undefined : await findActiveSessionForRole(role);
  const targetPodId = podId ?? session?.podId;
  if (!targetPodId) return { ok: false, reason: `No active pod found for ${role}` };
  const result = await stopRunPodPod(targetPodId);
  await writeAudit({ actorType: 'admin', action: 'model_runtime.stop', targetType: 'pod', targetId: targetPodId, status: result.ok ? 'ok' : 'failed' });
  return result;
}

export async function restartModelRuntime(role: ConcreteModelRole, podId?: string) {
  await stopModelRuntime(role, podId);
  return startModelRuntime(role, podId);
}

export async function getModelRuntimeLogs(role: ConcreteModelRole, podId?: string) {
  const session = podId ? undefined : await findActiveSessionForRole(role);
  const targetPodId = podId ?? session?.podId;
  if (!targetPodId) return { supported: false, logs: '', reason: `No active pod found for ${role}` };
  return getRunPodPodLogs(targetPodId);
}

export function assertModelRuntimeHealthy(taskType: string, requestedRole: ModelRole = 'auto') {
  const selection = selectModelForTask(taskType, requestedRole);
  if (selection.model.status !== 'healthy') {
    throw new Error(`Required private model ${selection.model.id} is ${selection.model.status}; run /model/status health checks and start a healthy runtime before executing tasks.`);
  }
  return selection;
}
