import { ConcreteModelRole, ModelRegistryEntry, ModelRole } from '@wyndme/shared';
import { LLAMA_REASONING_MODEL_ID, LLAMA_SERVED_MODEL_NAME, QWEN_CODER_MODEL_ID, QWEN_SERVED_MODEL_NAME, TASK_TYPE_MODEL_ROLE_DEFAULTS } from '@wyndme/shared';

const registry = new Map<string, ModelRegistryEntry>();

function register(entry: ModelRegistryEntry) {
  registry.set(entry.id, entry);
  return entry;
}

register({
  id: 'llama-reasoning-primary',
  modelName: process.env.LLAMA_REASONING_MODEL_ID || LLAMA_REASONING_MODEL_ID,
  modelProvider: 'runpod',
  modelFamily: 'llama',
  modelRole: 'business_reasoning',
  endpointUrl: process.env.LLAMA_SERVER_URL,
  servingEngine: 'vllm',
  gpuProvider: 'runpod',
  gpuProfile: process.env.LLAMA_GPU_PROFILE || '8xH100-80GB',
  status: process.env.LLAMA_SERVER_URL ? 'stopped' : 'not_configured',
  costEstimateHourlyUsd: Number(process.env.LLAMA_ESTIMATED_HOURLY_USD || 21.52),
  contextLength: Number(process.env.LLAMA_CONTEXT_LENGTH || 32768),
  enabled: true,
  servedModelName: process.env.LLAMA_SERVED_MODEL_NAME || LLAMA_SERVED_MODEL_NAME,
  priority: 10,
});

for (const role of ['research', 'architecture'] as const) {
  register({ ...registry.get('llama-reasoning-primary')!, id: `llama-${role}`, modelRole: role, priority: 20 });
}

register({
  id: 'qwen-coder-primary',
  modelName: process.env.QWEN_CODER_MODEL_ID || QWEN_CODER_MODEL_ID,
  modelProvider: 'runpod',
  modelFamily: 'qwen',
  modelRole: 'coding',
  endpointUrl: process.env.QWEN_SERVER_URL,
  servingEngine: 'vllm',
  gpuProvider: 'runpod',
  gpuProfile: process.env.QWEN_GPU_PROFILE || '4xH100-80GB-or-cheaper-compatible',
  status: process.env.QWEN_SERVER_URL ? 'stopped' : 'not_configured',
  costEstimateHourlyUsd: Number(process.env.QWEN_ESTIMATED_HOURLY_USD || 10.76),
  contextLength: Number(process.env.QWEN_CONTEXT_LENGTH || 262144),
  enabled: true,
  servedModelName: process.env.QWEN_SERVED_MODEL_NAME || QWEN_SERVED_MODEL_NAME,
  priority: 10,
});

for (const role of ['qa', 'database', 'devops'] as const) {
  register({ ...registry.get('qwen-coder-primary')!, id: `qwen-${role}`, modelRole: role, priority: 20 });
}

register({
  id: 'test-small-infra',
  modelName: process.env.TEST_MODEL_ID || 'Qwen/Qwen3-Coder-30B-A3B-Instruct-FP8',
  modelProvider: 'runpod',
  modelFamily: 'test',
  modelRole: 'coding',
  endpointUrl: process.env.TEST_MODEL_SERVER_URL,
  servingEngine: 'vllm',
  gpuProvider: 'runpod',
  gpuProfile: '1-2xH100-or-RTX-6000-test-only',
  status: 'not_configured',
  costEstimateHourlyUsd: Number(process.env.TEST_MODEL_ESTIMATED_HOURLY_USD || 2),
  contextLength: Number(process.env.TEST_MODEL_CONTEXT_LENGTH || 32768),
  enabled: process.env.TEST_MODEL_ENABLED !== 'false',
  servedModelName: 'wyndme-test-model',
  priority: 100,
});

const qwenRoles = new Set<ConcreteModelRole>(['coding', 'qa', 'database', 'devops']);
const llamaRoles = new Set<ConcreteModelRole>(['business_reasoning', 'research', 'architecture']);

export function listModelRegistry() {
  return Array.from(registry.values()).sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id));
}

export function resolveModelRole(taskType: string, requestedRole: ModelRole): ConcreteModelRole {
  if (requestedRole !== 'auto') return requestedRole;
  return (TASK_TYPE_MODEL_ROLE_DEFAULTS[taskType] ?? 'business_reasoning') as ConcreteModelRole;
}

export function selectModelForTask(taskType: string, requestedRole: ModelRole = 'auto') {
  const resolvedModelRole = resolveModelRole(taskType, requestedRole);
  const preferredFamily = qwenRoles.has(resolvedModelRole) ? 'qwen' : llamaRoles.has(resolvedModelRole) ? 'llama' : undefined;
  const candidates = listModelRegistry().filter((model) => model.enabled && model.modelRole === resolvedModelRole);
  const familyCandidate = candidates.find((model) => model.modelFamily === preferredFamily);
  const selected = familyCandidate ?? candidates[0] ?? listModelRegistry().find((model) => model.enabled && model.modelFamily === preferredFamily) ?? listModelRegistry().find((model) => model.enabled);
  if (!selected) throw new Error(`No enabled model available for role ${resolvedModelRole}`);
  return { requestedRole, resolvedModelRole, model: selected };
}

export function getModelById(id: string) {
  return registry.get(id);
}

export function modelRoleOwner(role: ConcreteModelRole) {
  return qwenRoles.has(role) ? 'qwen_coder' : 'llama_reasoning';
}
