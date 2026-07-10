import { AiSession, AiTask, ModelRegistryEntry, RiskLevel, SessionStatus, TaskStatus } from '@wyndme/shared';
import { getSupabaseAdminClient, isSupabaseConfigured } from './supabaseClient.js';
import { AuditLogEntry, CostEvent, TaskLogEntry } from '../services/store.js';

type JsonRecord = Record<string, unknown>;

type SessionRow = {
  id: string;
  provider: 'runpod';
  model_id: string;
  model_role?: AiSession['modelRole'];
  status: SessionStatus;
  gpu_type?: string | null;
  gpu_count: number;
  max_hours: number;
  auto_stop_at?: string | null;
  estimated_hourly_cost?: number | null;
  pod_id?: string | null;
  endpoint_url?: string | null;
};

type TaskRow = {
  id: string;
  title: string;
  description: string;
  task_type?: string | null;
  model_role?: AiTask['modelRole'] | null;
  resolved_model_role?: AiTask['resolvedModelRole'] | null;
  assigned_model_id?: string | null;
  assigned_model_name?: string | null;
  status: TaskStatus;
  priority?: AiTask['priority'] | null;
  risk_level?: RiskLevel | null;
  allowed_tools?: string[] | null;
  requires_approval?: boolean | null;
};

type AuditRow = {
  id: string;
  actor_type: AuditLogEntry['actorType'];
  action: string;
  target_type?: string | null;
  target_id?: string | null;
  status: AuditLogEntry['status'];
  metadata?: JsonRecord | null;
  created_at: string;
};

type TaskLogRow = {
  id: string;
  task_id: string;
  log_level: TaskLogEntry['level'];
  message: string;
  metadata?: JsonRecord | null;
  created_at: string;
};

type CostEventRow = {
  id: string;
  session_id?: string | null;
  provider: 'runpod';
  resource_type?: string | null;
  gpu_type?: string | null;
  gpu_count?: number | null;
  estimated_hourly_cost?: number | null;
  estimated_total_cost?: number | null;
  event_type: string;
  created_at: string;
};

function requireSupabase() {
  return getSupabaseAdminClient();
}

function stripPrefix(id: string) {
  return id.replace(/^(session|task|audit|tasklog|cost)_/, '');
}

function withPrefix(prefix: string, id: string) {
  return id.startsWith(`${prefix}_`) ? id : `${prefix}_${id}`;
}

function modelRegistryFromRow(row: Record<string, unknown>): ModelRegistryEntry {
  return {
    id: String(row.id),
    modelName: String(row.model_name),
    modelProvider: row.model_provider as ModelRegistryEntry['modelProvider'],
    modelFamily: row.model_family as ModelRegistryEntry['modelFamily'],
    modelRole: row.model_role as ModelRegistryEntry['modelRole'],
    endpointUrl: row.model_endpoint_url ? String(row.model_endpoint_url) : undefined,
    servingEngine: row.serving_engine as ModelRegistryEntry['servingEngine'],
    gpuProvider: 'runpod',
    gpuProfile: String(row.gpu_profile),
    status: row.status as ModelRegistryEntry['status'],
    costEstimateHourlyUsd: row.cost_estimate_hourly_usd == null ? undefined : Number(row.cost_estimate_hourly_usd),
    contextLength: Number(row.context_length),
    enabled: Boolean(row.enabled),
    servedModelName: String(row.served_model_name),
    priority: Number(row.priority),
  };
}

function sessionFromRow(row: SessionRow): AiSession {
  return {
    id: withPrefix('session', row.id),
    provider: row.provider,
    modelId: row.model_id,
    modelRole: row.model_role ?? 'business_reasoning',
    status: row.status,
    gpuType: row.gpu_type ?? undefined,
    gpuCount: row.gpu_count,
    maxHours: row.max_hours,
    autoStopAt: row.auto_stop_at ?? undefined,
    estimatedHourlyCost: row.estimated_hourly_cost ?? undefined,
    podId: row.pod_id ?? undefined,
    endpointUrl: row.endpoint_url ?? undefined,
  };
}

function taskFromRow(row: TaskRow): AiTask {
  return {
    id: withPrefix('task', row.id),
    title: row.title,
    description: row.description,
    taskType: row.task_type ?? 'business_strategy',
    modelRole: row.model_role ?? 'auto',
    resolvedModelRole: row.resolved_model_role ?? 'business_reasoning',
    assignedModelId: row.assigned_model_id ?? '',
    assignedModelName: row.assigned_model_name ?? '',
    status: row.status,
    priority: row.priority ?? 'normal',
    riskLevel: row.risk_level ?? 'low',
    allowedTools: row.allowed_tools ?? ['chat_only'],
    requiresApproval: row.requires_approval ?? false,
  };
}

function auditFromRow(row: AuditRow): AuditLogEntry {
  return {
    id: withPrefix('audit', row.id),
    actorType: row.actor_type,
    action: row.action,
    targetType: row.target_type ?? undefined,
    targetId: row.target_id ?? undefined,
    status: row.status,
    metadata: row.metadata ?? undefined,
    createdAt: row.created_at,
  };
}

function taskLogFromRow(row: TaskLogRow): TaskLogEntry {
  return {
    id: withPrefix('tasklog', row.id),
    taskId: withPrefix('task', row.task_id),
    level: row.log_level,
    message: row.message,
    metadata: row.metadata ?? undefined,
    createdAt: row.created_at,
  };
}

function costEventFromRow(row: CostEventRow): CostEvent {
  return {
    id: withPrefix('cost', row.id),
    sessionId: row.session_id ? withPrefix('session', row.session_id) : undefined,
    provider: row.provider,
    resourceType: row.resource_type ?? 'runpod_pod',
    gpuType: row.gpu_type ?? undefined,
    gpuCount: row.gpu_count ?? undefined,
    estimatedHourlyCost: row.estimated_hourly_cost ?? undefined,
    estimatedTotalCost: row.estimated_total_cost ?? undefined,
    eventType: row.event_type,
    createdAt: row.created_at,
  };
}

export const orchestratorRepository = {
  isConfigured: isSupabaseConfigured,

  async listModelRegistry() {
    const { data, error } = await requireSupabase()
      .from('model_registry')
      .select('*')
      .order('priority', { ascending: true })
      .order('model_role', { ascending: true });
    if (error) throw error;
    return (data ?? []).map((row) => modelRegistryFromRow(row));
  },

  async listSessions() {
    const { data, error } = await requireSupabase().from('ai_sessions').select('*').order('created_at', { ascending: false }).limit(100);
    if (error) throw error;
    return ((data ?? []) as SessionRow[]).map(sessionFromRow);
  },

  async upsertSession(session: AiSession) {
    const { data, error } = await requireSupabase().from('ai_sessions').upsert({
      id: stripPrefix(session.id),
      provider: session.provider,
      model_id: session.modelId,
      model_role: session.modelRole,
      status: session.status,
      gpu_type: session.gpuType,
      gpu_count: session.gpuCount,
      max_hours: session.maxHours,
      auto_stop_at: session.autoStopAt,
      estimated_hourly_cost: session.estimatedHourlyCost,
      pod_id: session.podId,
      endpoint_url: session.endpointUrl,
      updated_at: new Date().toISOString(),
    }).select('*').single();
    if (error) throw error;
    return sessionFromRow(data as SessionRow);
  },

  async updateSessionStatus(sessionId: string, status: SessionStatus) {
    const { data, error } = await requireSupabase()
      .from('ai_sessions')
      .update({ status, updated_at: new Date().toISOString(), stopped_at: ['stopped', 'failed'].includes(status) ? new Date().toISOString() : undefined })
      .eq('id', stripPrefix(sessionId))
      .select('*')
      .single();
    if (error) throw error;
    return sessionFromRow(data as SessionRow);
  },

  async listTasks() {
    const { data, error } = await requireSupabase().from('ai_tasks').select('*').order('created_at', { ascending: false }).limit(100);
    if (error) throw error;
    return ((data ?? []) as TaskRow[]).map(taskFromRow);
  },

  async upsertTask(task: AiTask) {
    const { data, error } = await requireSupabase().from('ai_tasks').upsert({
      id: stripPrefix(task.id),
      title: task.title,
      description: task.description,
      task_type: task.taskType,
      model_role: task.modelRole,
      resolved_model_role: task.resolvedModelRole,
      assigned_model_id: task.assignedModelId,
      assigned_model_name: task.assignedModelName,
      status: task.status,
      priority: task.priority,
      risk_level: task.riskLevel,
      allowed_tools: task.allowedTools,
      requires_approval: task.requiresApproval,
      updated_at: new Date().toISOString(),
    }).select('*').single();
    if (error) throw error;
    return taskFromRow(data as TaskRow);
  },

  async updateTaskStatus(taskId: string, status: TaskStatus, outputSummary?: string) {
    const { data, error } = await requireSupabase()
      .from('ai_tasks')
      .update({ status, output_summary: outputSummary, updated_at: new Date().toISOString(), completed_at: status === 'completed' ? new Date().toISOString() : undefined })
      .eq('id', stripPrefix(taskId))
      .select('*')
      .single();
    if (error) throw error;
    return taskFromRow(data as TaskRow);
  },

  async insertTaskLog(entry: Omit<TaskLogEntry, 'id' | 'createdAt'>) {
    const { data, error } = await requireSupabase().from('ai_task_logs').insert({
      task_id: stripPrefix(entry.taskId),
      log_level: entry.level,
      message: entry.message,
      metadata: entry.metadata ?? {},
    }).select('*').single();
    if (error) throw error;
    return taskLogFromRow(data as TaskLogRow);
  },

  async listTaskLogs(taskId: string) {
    const { data, error } = await requireSupabase()
      .from('ai_task_logs')
      .select('*')
      .eq('task_id', stripPrefix(taskId))
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw error;
    return ((data ?? []) as TaskLogRow[]).map(taskLogFromRow);
  },

  async insertAuditLog(entry: Omit<AuditLogEntry, 'id' | 'createdAt'>) {
    const { data, error } = await requireSupabase().from('audit_logs').insert({
      actor_type: entry.actorType,
      action: entry.action,
      target_type: entry.targetType,
      target_id: entry.targetId,
      status: entry.status,
      metadata: entry.metadata ?? {},
    }).select('*').single();
    if (error) throw error;
    return auditFromRow(data as AuditRow);
  },

  async listAuditLogs() {
    const { data, error } = await requireSupabase().from('audit_logs').select('*').order('created_at', { ascending: false }).limit(100);
    if (error) throw error;
    return ((data ?? []) as AuditRow[]).map(auditFromRow);
  },

  async insertCostEvent(entry: Omit<CostEvent, 'id' | 'createdAt'>) {
    const { data, error } = await requireSupabase().from('cost_events').insert({
      session_id: entry.sessionId ? stripPrefix(entry.sessionId) : undefined,
      provider: entry.provider,
      resource_type: entry.resourceType,
      gpu_type: entry.gpuType,
      gpu_count: entry.gpuCount,
      estimated_hourly_cost: entry.estimatedHourlyCost,
      estimated_total_cost: entry.estimatedTotalCost,
      event_type: entry.eventType,
    }).select('*').single();
    if (error) throw error;
    return costEventFromRow(data as CostEventRow);
  },

  async listCostEvents() {
    const { data, error } = await requireSupabase().from('cost_events').select('*').order('created_at', { ascending: false }).limit(100);
    if (error) throw error;
    return ((data ?? []) as CostEventRow[]).map(costEventFromRow);
  },
};
