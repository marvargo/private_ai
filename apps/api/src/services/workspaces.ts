import { randomUUID } from 'node:crypto';
import { getSupabaseAdminClient, isSupabaseConfigured } from '../repositories/supabaseClient.js';
import { writeAudit } from './orchestrator.js';

type WorkspaceKind = 'studio_asset' | 'code_project' | 'workflow' | 'integration' | 'analytics_event';

export interface WorkspaceRecord {
  id: string;
  projectId?: string;
  ownerId?: string;
  kind: WorkspaceKind;
  name: string;
  status: string;
  capability: string;
  category?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

const records = new Map<string, WorkspaceRecord>();
function id(prefix: string) { return `${prefix}_${randomUUID()}`; }
function strip(value?: string) { return value?.replace(/^[a-z_]+_/, ''); }
function prefix(kind: WorkspaceKind, value: string) { return value.includes('_') ? value : `${kind}_${value}`; }
function tableFor(kind: WorkspaceKind) {
  if (kind === 'studio_asset') return 'project_assets';
  if (kind === 'analytics_event') return 'capability_usage_events';
  return 'project_workspace_items';
}
function fromRow(kind: WorkspaceKind, row: any): WorkspaceRecord {
  if (kind === 'studio_asset') return { id: prefix(kind, row.id), projectId: row.project_id ? `project_${row.project_id}` : undefined, ownerId: row.owner_id ?? undefined, kind, name: row.metadata?.name ?? row.asset_type, status: row.metadata?.status ?? 'draft', capability: row.capability, category: row.asset_type, metadata: row.metadata ?? {}, createdAt: row.created_at, updatedAt: row.created_at };
  if (kind === 'analytics_event') return { id: prefix(kind, row.id), projectId: row.project_id ? `project_${row.project_id}` : undefined, ownerId: row.user_id ?? undefined, kind, name: `${row.capability} usage`, status: row.success ? 'success' : 'failed', capability: row.capability, category: row.category, metadata: { durationMs: row.duration_ms, latencyMs: row.latency_ms, totalTokens: row.total_tokens, estimatedCost: row.estimated_cost }, createdAt: row.created_at, updatedAt: row.created_at };
  return { id: prefix(kind, row.id), projectId: row.project_id ? `project_${row.project_id}` : undefined, ownerId: row.owner_id ?? undefined, kind, name: row.name, status: row.status, capability: row.capability, category: row.category ?? undefined, metadata: row.metadata ?? {}, createdAt: row.created_at, updatedAt: row.updated_at };
}

export async function listWorkspaceRecords(kind: WorkspaceKind, ownerId?: string, projectId?: string) {
  if (isSupabaseConfigured()) {
    try {
      const table = tableFor(kind);
      let query = getSupabaseAdminClient().from(table).select('*').order(kind === 'studio_asset' || kind === 'analytics_event' ? 'created_at' : 'updated_at', { ascending: false });
      if (kind !== 'analytics_event') query = query.eq(kind === 'studio_asset' ? 'asset_type' : 'kind', kind === 'studio_asset' ? 'generated_media' : kind);
      if (ownerId) query = query.eq(kind === 'analytics_event' ? 'user_id' : 'owner_id', ownerId);
      if (projectId) query = query.eq('project_id', strip(projectId));
      const { data, error } = await query.limit(100);
      if (error) throw error;
      return (data ?? []).map((row) => fromRow(kind, row));
    } catch { /* local fallback */ }
  }
  return Array.from(records.values()).filter((record) => record.kind === kind && (!ownerId || record.ownerId === ownerId) && (!projectId || record.projectId === projectId)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function createWorkspaceRecord(input: { kind: WorkspaceKind; ownerId?: string; projectId?: string; name: string; status?: string; capability: string; category?: string; metadata?: Record<string, unknown> }) {
  const now = new Date().toISOString();
  const record: WorkspaceRecord = { id: id(input.kind), projectId: input.projectId, ownerId: input.ownerId, kind: input.kind, name: input.name, status: input.status ?? 'draft', capability: input.capability, category: input.category, metadata: input.metadata ?? {}, createdAt: now, updatedAt: now };
  records.set(record.id, record);
  if (isSupabaseConfigured()) {
    try {
      if (input.kind === 'studio_asset') {
        const { data, error } = await getSupabaseAdminClient().from('project_assets').insert({ id: strip(record.id), project_id: strip(input.projectId), owner_id: input.ownerId, capability: input.capability, asset_type: 'generated_media', metadata: { ...record.metadata, name: input.name, status: record.status, category: input.category } }).select('*').single();
        if (error) throw error;
        return fromRow(input.kind, data);
      }
      const { data, error } = await getSupabaseAdminClient().from('project_workspace_items').insert({ id: strip(record.id), project_id: strip(input.projectId), owner_id: input.ownerId, kind: input.kind, name: input.name, status: record.status, capability: input.capability, category: input.category, metadata: record.metadata }).select('*').single();
      if (error) throw error;
      return fromRow(input.kind, data);
    } catch { /* local fallback */ }
  }
  await writeAudit({ actorType: 'system', action: `${input.capability}.workspace_record.created`, targetType: input.kind, targetId: record.id, status: 'ok', metadata: { projectId: input.projectId, category: input.category } });
  return record;
}

export async function usageSummary(ownerId?: string, projectId?: string) {
  const local = await listWorkspaceRecords('analytics_event', ownerId, projectId);
  const byCapability: Record<string, { count: number; success: number; failure: number }> = {};
  for (const event of local) {
    byCapability[event.capability] ??= { count: 0, success: 0, failure: 0 };
    byCapability[event.capability].count += 1;
    if (event.status === 'success') byCapability[event.capability].success += 1;
    else byCapability[event.capability].failure += 1;
  }
  return { events: local.length, byCapability };
}
