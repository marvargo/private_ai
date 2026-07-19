import { randomUUID } from 'node:crypto';
import { AiSession, AiTask, ModelRegistryEntry, ModelRole, SessionStatus, TaskStatus } from '@wyndme/shared';
import { DEFAULT_MAX_SESSION_HOURS, PRIMARY_MODEL_ID } from '@wyndme/shared';
import { AppError } from '../errors/AppError.js';
import { listModelRegistry as listTestModelRegistry } from './modelRegistry.js';
import { getDevelopmentInMemoryStores } from '../repositories/index.js';
import { orchestratorRepository } from '../repositories/orchestratorRepository.js';
import {
  AppStateSnapshot,
  AuditLogEntry,
  CostEvent,
  RuntimeStatus,
  TaskLogEntry,
  createSession as createTestSession,
  createTask as createTestTask,
  getRuntimeStatus,
  listAuditLogs as listTestAuditLogs,
  listCostEvents as listTestCostEvents,
  listSessions as listTestSessions,
  listTaskLogs as listTestTaskLogs,
  listTasks as listTestTasks,
  snapshot as testSnapshot,
  updateSessionStatus as updateTestSessionStatus,
  updateTaskStatus as updateTestTaskStatus,
  writeAudit as writeTestAudit,
  writeCostEvent as writeTestCostEvent,
  writeTaskLog as writeTestTaskLog,
} from './store.js';

function persistenceEnabled() {
  return orchestratorRepository.isConfigured();
}

function fallback<T>(operation: () => T) {
  // Throws PERSISTENCE_REQUIRED unless an explicitly enabled development/test factory is active.
  getDevelopmentInMemoryStores();
  return operation();
}

function databaseFailure(operation: string, error: unknown): AppError {
  return new AppError({
    message: 'Persistent storage is temporarily unavailable',
    code: 'PERSISTENCE_UNAVAILABLE',
    statusCode: 503,
    safeDetails: { operation },
    cause: error,
  });
}

function taskFromRegistry(input: Omit<AiTask, 'id' | 'status' | 'resolvedModelRole' | 'assignedModelId' | 'assignedModelName'> & { status?: TaskStatus; modelRole?: ModelRole }, models: ModelRegistryEntry[]): AiTask {
  const desiredRole = input.modelRole === 'auto' || !input.modelRole ? undefined : input.modelRole;
  const model = models.find((candidate) => candidate.enabled && (!desiredRole || candidate.modelRole === desiredRole)) ?? models.find((candidate) => candidate.enabled);
  if (!model) throw new AppError({ message: 'No private capability is available', code: 'NO_CAPACITY', statusCode: 503 });
  return {
    id: `task_${randomUUID()}`,
    status: input.status ?? 'queued',
    ...input,
    modelRole: input.modelRole ?? 'auto',
    resolvedModelRole: model.modelRole,
    assignedModelId: model.id,
    assignedModelName: model.modelName,
  };
}

function sessionFromRegistry(input: Parameters<typeof createTestSession>[0], models: ModelRegistryEntry[]): AiSession {
  const model = models.find((candidate) => candidate.enabled && candidate.modelRole === (input.modelRole ?? 'business_reasoning'));
  const maxHours = input.maxHours ?? DEFAULT_MAX_SESSION_HOURS;
  return {
    id: `session_${randomUUID()}`,
    provider: 'runpod',
    modelId: input.modelId ?? model?.modelName ?? PRIMARY_MODEL_ID,
    modelRole: input.modelRole ?? 'business_reasoning',
    status: 'pending',
    gpuType: input.gpuType,
    gpuCount: input.gpuCount,
    maxHours,
    podId: input.podId,
    endpointUrl: input.endpointUrl,
    estimatedHourlyCost: input.estimatedHourlyCost,
    autoStopAt: new Date(Date.now() + maxHours * 60 * 60 * 1000).toISOString(),
  };
}

export async function listModelRegistry() {
  if (!persistenceEnabled()) return fallback(listTestModelRegistry);
  try { return await orchestratorRepository.listModelRegistry(); } catch (error) { throw databaseFailure('list_model_registry', error); }
}

export async function listSessions() {
  if (!persistenceEnabled()) return fallback(listTestSessions);
  try { return await orchestratorRepository.listSessions(); } catch (error) { throw databaseFailure('list_sessions', error); }
}

export async function createSession(input: Parameters<typeof createTestSession>[0]) {
  if (!persistenceEnabled()) return fallback(() => createTestSession(input));
  try {
    const saved = await orchestratorRepository.upsertSession(sessionFromRegistry(input, await listModelRegistry()));
    await orchestratorRepository.insertAuditLog({ actorType: 'admin', action: 'session.created', targetType: 'ai_session', targetId: saved.id, status: 'ok', metadata: { sessionName: input.sessionName } });
    return saved;
  } catch (error) { throw databaseFailure('create_session', error); }
}

export async function updateSessionStatus(sessionId: string, status: SessionStatus) {
  if (!persistenceEnabled()) return fallback(() => updateTestSessionStatus(sessionId, status));
  try { return await orchestratorRepository.updateSessionStatus(sessionId, status); } catch (error) { throw databaseFailure('update_session_status', error); }
}

export async function listTasks() {
  if (!persistenceEnabled()) return fallback(listTestTasks);
  try { return await orchestratorRepository.listTasks(); } catch (error) { throw databaseFailure('list_tasks', error); }
}

export async function createTask(input: Omit<AiTask, 'id' | 'status' | 'resolvedModelRole' | 'assignedModelId' | 'assignedModelName'> & { status?: TaskStatus; modelRole?: ModelRole }) {
  if (!persistenceEnabled()) return fallback(() => createTestTask(input));
  try { return await orchestratorRepository.upsertTask(taskFromRegistry(input, await listModelRegistry())); } catch (error) { throw databaseFailure('create_task', error); }
}

export async function claimNextQueuedTask(workerId: string, lockSeconds = 300) {
  if (!persistenceEnabled()) return fallback(() => listTestTasks().find((task) => task.status === 'queued'));
  try { return await orchestratorRepository.claimNextQueuedTask(workerId, lockSeconds); } catch (error) { throw databaseFailure('claim_next_queued_task', error); }
}

export async function updateTaskStatus(taskId: string, status: TaskStatus, outputSummary?: string) {
  if (!persistenceEnabled()) return fallback(() => updateTestTaskStatus(taskId, status, outputSummary));
  try { return await orchestratorRepository.updateTaskStatus(taskId, status, outputSummary); } catch (error) { throw databaseFailure('update_task_status', error); }
}

export async function listTaskLogs(taskId: string) {
  if (!persistenceEnabled()) return fallback(() => listTestTaskLogs(taskId));
  try { return await orchestratorRepository.listTaskLogs(taskId); } catch (error) { throw databaseFailure('list_task_logs', error); }
}

export async function writeAudit(entry: Omit<AuditLogEntry, 'id' | 'createdAt'>) {
  if (!persistenceEnabled()) return fallback(() => writeTestAudit(entry));
  try { return await orchestratorRepository.insertAuditLog(entry); } catch (error) { throw databaseFailure('write_audit', error); }
}

export async function writeCostEvent(entry: Omit<CostEvent, 'id' | 'createdAt'>) {
  if (!persistenceEnabled()) return fallback(() => writeTestCostEvent(entry));
  try { return await orchestratorRepository.insertCostEvent(entry); } catch (error) { throw databaseFailure('write_cost_event', error); }
}

export async function listAuditLogs() {
  if (!persistenceEnabled()) return fallback(listTestAuditLogs);
  try { return await orchestratorRepository.listAuditLogs(); } catch (error) { throw databaseFailure('list_audit_logs', error); }
}

export async function listCostEvents() {
  if (!persistenceEnabled()) return fallback(listTestCostEvents);
  try { return await orchestratorRepository.listCostEvents(); } catch (error) { throw databaseFailure('list_cost_events', error); }
}

export async function writeTaskLog(taskId: string, level: TaskLogEntry['level'], message: string, metadata?: Record<string, unknown>) {
  if (!persistenceEnabled()) return fallback(() => writeTestTaskLog(taskId, level, message, metadata));
  try { return await orchestratorRepository.insertTaskLog({ taskId, level, message, metadata }); } catch (error) { throw databaseFailure('write_task_log', error); }
}

export async function snapshot(): Promise<AppStateSnapshot> {
  if (!persistenceEnabled()) return fallback(testSnapshot);
  const [sessions, tasks, auditLogs, modelRegistry, costEvents] = await Promise.all([listSessions(), listTasks(), listAuditLogs(), listModelRegistry(), listCostEvents()]);
  return { sessions, tasks, auditLogs, runtime: getRuntimeStatus() as RuntimeStatus, modelRegistry, costEvents };
}
