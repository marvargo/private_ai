import { AiSession, AiTask, ModelRole, SessionStatus, TaskStatus } from '@wyndme/shared';
import { orchestratorRepository } from '../repositories/orchestratorRepository.js';
import {
  AppStateSnapshot,
  AuditLogEntry,
  CostEvent,
  createSession as createLocalSession,
  createTask as createLocalTask,
  getRuntimeStatus,
  listAuditLogs as listLocalAuditLogs,
  listCostEvents as listLocalCostEvents,
  listSessions as listLocalSessions,
  listTaskLogs as listLocalTaskLogs,
  listTasks as listLocalTasks,
  snapshot as localSnapshot,
  updateSessionStatus as updateLocalSessionStatus,
  updateTaskStatus as updateLocalTaskStatus,
  writeAudit as writeLocalAudit,
  writeCostEvent as writeLocalCostEvent,
  writeTaskLog as writeLocalTaskLog,
} from './store.js';
import { listModelRegistry as listLocalModelRegistry } from './modelRegistry.js';

function persistenceEnabled() {
  return orchestratorRepository.isConfigured();
}

async function persistentOrFallback<T>(operation: () => Promise<T>, fallback: () => T) {
  if (!persistenceEnabled()) return fallback();
  try {
    return await operation();
  } catch (error) {
    writeLocalAudit({
      actorType: 'system',
      action: 'supabase.persistence_fallback',
      targetType: 'orchestrator_repository',
      status: 'failed',
      metadata: { message: error instanceof Error ? error.message : String(error) },
    });
    return fallback();
  }
}

export async function listModelRegistry() {
  return persistentOrFallback(() => orchestratorRepository.listModelRegistry(), listLocalModelRegistry);
}

export async function listSessions() {
  return persistentOrFallback(() => orchestratorRepository.listSessions(), listLocalSessions);
}

export async function createSession(input: Parameters<typeof createLocalSession>[0]) {
  const session = createLocalSession(input);
  if (!persistenceEnabled()) return session;
  try {
    const saved = await orchestratorRepository.upsertSession(session);
    await orchestratorRepository.insertAuditLog({ actorType: 'admin', action: 'session.created', targetType: 'ai_session', targetId: saved.id, status: 'ok', metadata: { sessionName: input.sessionName } });
    if (session.estimatedHourlyCost) {
      await orchestratorRepository.insertCostEvent({
        sessionId: saved.id,
        provider: 'runpod',
        resourceType: 'runpod_pod',
        gpuType: session.gpuType,
        gpuCount: session.gpuCount,
        estimatedHourlyCost: session.estimatedHourlyCost,
        estimatedTotalCost: session.estimatedHourlyCost * session.maxHours,
        eventType: 'session.estimated',
      });
    }
    return saved;
  } catch (error) {
    writeLocalAudit({ actorType: 'system', action: 'supabase.session_persist_failed', targetType: 'ai_session', targetId: session.id, status: 'failed', metadata: { message: error instanceof Error ? error.message : String(error) } });
    return session;
  }
}

export async function updateSessionStatus(sessionId: string, status: SessionStatus) {
  if (!persistenceEnabled()) return updateLocalSessionStatus(sessionId, status);
  try {
    const saved = await orchestratorRepository.updateSessionStatus(sessionId, status);
    await orchestratorRepository.insertAuditLog({ actorType: 'system', action: `session.${status}`, targetType: 'ai_session', targetId: saved.id, status: 'ok' });
    return saved;
  } catch (error) {
    writeLocalAudit({ actorType: 'system', action: 'supabase.session_status_persist_failed', targetType: 'ai_session', targetId: sessionId, status: 'failed', metadata: { message: error instanceof Error ? error.message : String(error) } });
    return updateLocalSessionStatus(sessionId, status);
  }
}

export async function listTasks() {
  return persistentOrFallback(() => orchestratorRepository.listTasks(), listLocalTasks);
}

export async function createTask(input: Omit<AiTask, 'id' | 'status' | 'resolvedModelRole' | 'assignedModelId' | 'assignedModelName'> & { status?: TaskStatus; modelRole?: ModelRole }) {
  const task = createLocalTask(input);
  if (!persistenceEnabled()) return task;
  try {
    const saved = await orchestratorRepository.upsertTask(task);
    await orchestratorRepository.insertTaskLog({
      taskId: saved.id,
      level: 'info',
      message: `Task queued for ${saved.assignedModelName} via ${saved.resolvedModelRole}`,
      metadata: { riskLevel: saved.riskLevel, allowedTools: saved.allowedTools, assignedModelId: saved.assignedModelId, assignedModelName: saved.assignedModelName },
    });
    await orchestratorRepository.insertAuditLog({ actorType: 'admin', action: 'task.created', targetType: 'ai_task', targetId: saved.id, status: 'ok' });
    return saved;
  } catch (error) {
    writeLocalAudit({ actorType: 'system', action: 'supabase.task_persist_failed', targetType: 'ai_task', targetId: task.id, status: 'failed', metadata: { message: error instanceof Error ? error.message : String(error) } });
    return task;
  }
}


export async function claimNextQueuedTask(workerId: string, lockSeconds = 300) {
  if (!persistenceEnabled()) return listLocalTasks().find((task) => task.status === 'queued');
  try {
    return await orchestratorRepository.claimNextQueuedTask(workerId, lockSeconds);
  } catch (error) {
    writeLocalAudit({ actorType: 'system', action: 'supabase.task_claim_failed', targetType: 'ai_task', status: 'failed', metadata: { message: error instanceof Error ? error.message : String(error) } });
    return listLocalTasks().find((task) => task.status === 'queued');
  }
}

export async function updateTaskStatus(taskId: string, status: TaskStatus, outputSummary?: string) {
  if (!persistenceEnabled()) return updateLocalTaskStatus(taskId, status, outputSummary);
  try {
    const saved = await orchestratorRepository.updateTaskStatus(taskId, status, outputSummary);
    await orchestratorRepository.insertTaskLog({ taskId: saved.id, level: status === 'failed' ? 'error' : 'info', message: `Task status changed to ${status}` });
    return saved;
  } catch (error) {
    writeLocalAudit({ actorType: 'system', action: 'supabase.task_status_persist_failed', targetType: 'ai_task', targetId: taskId, status: 'failed', metadata: { message: error instanceof Error ? error.message : String(error) } });
    return updateLocalTaskStatus(taskId, status, outputSummary);
  }
}

export async function listTaskLogs(taskId: string) {
  return persistentOrFallback(() => orchestratorRepository.listTaskLogs(taskId), () => listLocalTaskLogs(taskId));
}

export async function writeAudit(entry: Omit<AuditLogEntry, 'id' | 'createdAt'>) {
  const local = writeLocalAudit(entry);
  if (!persistenceEnabled()) return local;
  try {
    return await orchestratorRepository.insertAuditLog(entry);
  } catch {
    return local;
  }
}

export async function writeCostEvent(entry: Omit<CostEvent, 'id' | 'createdAt'>) {
  const local = writeLocalCostEvent(entry);
  if (!persistenceEnabled()) return local;
  try {
    return await orchestratorRepository.insertCostEvent(entry);
  } catch {
    return local;
  }
}

export async function listAuditLogs() {
  return persistentOrFallback(() => orchestratorRepository.listAuditLogs(), listLocalAuditLogs);
}

export async function listCostEvents() {
  return persistentOrFallback(() => orchestratorRepository.listCostEvents(), listLocalCostEvents);
}

export async function writeTaskLog(taskId: string, level: Parameters<typeof writeLocalTaskLog>[1], message: string, metadata?: Record<string, unknown>) {
  const local = writeLocalTaskLog(taskId, level, message, metadata);
  if (!persistenceEnabled()) return local;
  try {
    return await orchestratorRepository.insertTaskLog({ taskId, level, message, metadata });
  } catch {
    return local;
  }
}

export async function snapshot(): Promise<AppStateSnapshot> {
  if (!persistenceEnabled()) return localSnapshot();
  const [sessions, tasks, auditLogs, modelRegistry, costEvents] = await Promise.all([
    listSessions(),
    listTasks(),
    listAuditLogs(),
    listModelRegistry(),
    listCostEvents(),
  ]);
  return { sessions, tasks, auditLogs, runtime: getRuntimeStatus(), modelRegistry, costEvents };
}
