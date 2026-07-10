import { randomUUID } from 'node:crypto';
import { AiSession, AiTask, ConcreteModelRole, ModelRegistryEntry, ModelRole, SessionStatus, TaskStatus } from '@wyndme/shared';
import { DEFAULT_MAX_SESSION_HOURS, PRIMARY_MODEL_ID } from '@wyndme/shared';
import { listModelRegistry, selectModelForTask } from './modelRegistry.js';

export interface AuditLogEntry {
  id: string;
  actorType: 'system' | 'admin' | 'worker';
  action: string;
  targetType?: string;
  targetId?: string;
  status: 'ok' | 'blocked' | 'failed';
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface CostEvent {
  id: string;
  sessionId?: string;
  provider: 'runpod';
  resourceType: string;
  gpuType?: string;
  gpuCount?: number;
  estimatedHourlyCost?: number;
  estimatedTotalCost?: number;
  eventType: string;
  createdAt: string;
}

export interface TaskLogEntry {
  id: string;
  taskId: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface RuntimeStatus {
  modelId: string;
  servingEngine: 'vllm' | 'sglang';
  status: 'not_configured' | 'stopped' | 'starting' | 'healthy' | 'unhealthy';
  apiBaseUrl?: string;
  contextLength: number;
  quantization: string;
  tensorParallelSize: number;
  pipelineParallelSize: number;
  lastHealthCheckAt?: string;
}

export interface AppStateSnapshot {
  sessions: AiSession[];
  tasks: AiTask[];
  auditLogs: AuditLogEntry[];
  runtime: RuntimeStatus;
  modelRegistry: ModelRegistryEntry[];
  costEvents: CostEvent[];
}

const sessions = new Map<string, AiSession>();
const tasks = new Map<string, AiTask>();
const auditLogs: AuditLogEntry[] = [];
const taskLogs: TaskLogEntry[] = [];
const costEvents: CostEvent[] = [];

const runtime: RuntimeStatus = {
  modelId: process.env.MODEL_ID || PRIMARY_MODEL_ID,
  servingEngine: 'vllm',
  status: process.env.LLAMA_SERVER_URL ? 'stopped' : 'not_configured',
  apiBaseUrl: process.env.LLAMA_SERVER_URL,
  contextLength: Number(process.env.LLAMA_CONTEXT_LENGTH || 32768),
  quantization: process.env.MODEL_QUANTIZATION || 'fp8',
  tensorParallelSize: Number(process.env.LLAMA_TENSOR_PARALLEL_SIZE || 8),
  pipelineParallelSize: Number(process.env.LLAMA_PIPELINE_PARALLEL_SIZE || 1),
};

function id(prefix: string) {
  return `${prefix}_${randomUUID()}`;
}

export function writeAudit(entry: Omit<AuditLogEntry, 'id' | 'createdAt'>) {
  const saved = { id: id('audit'), createdAt: new Date().toISOString(), ...entry };
  auditLogs.unshift(saved);
  return saved;
}

export function createSession(input: {
  sessionName: string;
  gpuType: string;
  gpuCount: number;
  modelRole?: ConcreteModelRole;
  modelId?: string;
  estimatedHourlyCost?: number;
  maxHours?: number;
  podId?: string;
  endpointUrl?: string;
}) {
  const now = new Date();
  const maxHours = input.maxHours ?? DEFAULT_MAX_SESSION_HOURS;
  const modelRole = input.modelRole || 'business_reasoning';
  const selectedModel = listModelRegistry().find((model) => model.modelRole === modelRole && model.enabled);
  const session: AiSession = {
    id: id('session'),
    provider: 'runpod',
    modelId: input.modelId || selectedModel?.modelName || PRIMARY_MODEL_ID,
    modelRole,
    status: 'pending',
    gpuType: input.gpuType,
    gpuCount: input.gpuCount,
    maxHours,
    podId: input.podId,
    endpointUrl: input.endpointUrl,
    estimatedHourlyCost: input.estimatedHourlyCost,
    autoStopAt: new Date(now.getTime() + maxHours * 60 * 60 * 1000).toISOString(),
  };
  sessions.set(session.id, session);
  writeAudit({ actorType: 'admin', action: 'session.created', targetType: 'ai_session', targetId: session.id, status: 'ok', metadata: { sessionName: input.sessionName } });
  return session;
}

export function updateSessionStatus(sessionId: string, status: SessionStatus) {
  const existing = sessions.get(sessionId);
  if (!existing) throw new Error(`Session ${sessionId} not found`);
  const updated = { ...existing, status };
  sessions.set(sessionId, updated);
  writeAudit({ actorType: 'system', action: `session.${status}`, targetType: 'ai_session', targetId: sessionId, status: 'ok' });
  return updated;
}

export function listSessions() { return Array.from(sessions.values()); }
export function getSession(sessionId: string) { return sessions.get(sessionId); }

export function createTask(input: Omit<AiTask, 'id' | 'status' | 'resolvedModelRole' | 'assignedModelId' | 'assignedModelName'> & { status?: TaskStatus; modelRole?: ModelRole }) {
  const selected = selectModelForTask(input.taskType, input.modelRole ?? 'auto');
  const task: AiTask = { id: id('task'), status: input.status ?? 'queued', ...input, modelRole: input.modelRole ?? 'auto', resolvedModelRole: selected.resolvedModelRole, assignedModelId: selected.model.id, assignedModelName: selected.model.modelName };
  tasks.set(task.id, task);
  writeTaskLog(task.id, 'info', `Task queued for ${selected.model.modelFamily} via ${selected.resolvedModelRole}`, { riskLevel: task.riskLevel, allowedTools: task.allowedTools, assignedModelId: selected.model.id, assignedModelName: selected.model.modelName });
  writeAudit({ actorType: 'admin', action: 'task.created', targetType: 'ai_task', targetId: task.id, status: 'ok' });
  return task;
}

export function updateTaskStatus(taskId: string, status: TaskStatus, outputSummary?: string) {
  const existing = tasks.get(taskId);
  if (!existing) throw new Error(`Task ${taskId} not found`);
  const updated = { ...existing, status, outputSummary };
  tasks.set(taskId, updated);
  writeTaskLog(taskId, status === 'failed' ? 'error' : 'info', `Task status changed to ${status}`);
  return updated;
}

export function listTasks() { return Array.from(tasks.values()); }
export function getTask(taskId: string) { return tasks.get(taskId); }

export function writeTaskLog(taskId: string, level: TaskLogEntry['level'], message: string, metadata?: Record<string, unknown>) {
  const saved = { id: id('tasklog'), taskId, level, message, metadata, createdAt: new Date().toISOString() };
  taskLogs.unshift(saved);
  return saved;
}

export function listTaskLogs(taskId: string) { return taskLogs.filter((entry) => entry.taskId === taskId); }
export function writeCostEvent(entry: Omit<CostEvent, 'id' | 'createdAt'>) {
  const saved = { id: id('cost'), createdAt: new Date().toISOString(), ...entry };
  costEvents.unshift(saved);
  return saved;
}

export function listCostEvents() { return costEvents.slice(0, 100); }
export function listAuditLogs() { return auditLogs.slice(0, 100); }
export function getRuntimeStatus() { return runtime; }

export function snapshot(): AppStateSnapshot {
  return { sessions: listSessions(), tasks: listTasks(), auditLogs: listAuditLogs(), runtime: getRuntimeStatus(), modelRegistry: listModelRegistry(), costEvents: listCostEvents() };
}
