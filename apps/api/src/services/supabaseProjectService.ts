import { randomUUID } from 'node:crypto';
import { SupabaseProject } from '@wyndme/shared';
import { env } from '../utils/env.js';
import { getSupabaseAdminClient, isSupabaseConfigured } from '../repositories/supabaseClient.js';
import { requestApproval } from './approvals.js';
import { writeAudit } from './orchestrator.js';

const projects = new Map<string, SupabaseProject>();
const drafts = new Map<string, { id: string; projectId: string; name: string; sql: string; createdAt: string }>();

type Fetcher = typeof fetch;
function id(prefix: string) { return `${prefix}_${randomUUID()}`; }
function stripPrefix(value: string) { return value.replace(/^(supabase_project|migration_draft)_/, ''); }
function toProject(row: any): SupabaseProject { return { id: `supabase_project_${row.id}`, providerCredentialId: row.provider_credential_id ?? undefined, organizationId: row.organization_id ?? undefined, projectRef: row.project_ref, projectName: row.project_name ?? undefined, region: row.region ?? undefined, status: row.status ?? undefined, connectedAt: row.connected_at }; }

export async function testSupabaseManagementConnection(fetcher: Fetcher = fetch) {
  if (!env.SUPABASE_ACCESS_TOKEN) return { ok: false, reason: 'SUPABASE_ACCESS_TOKEN is required for Management API project listing.' };
  const response = await fetcher('https://api.supabase.com/v1/projects', { headers: { authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}` } });
  return { ok: response.ok, status: response.status };
}

export async function listSupabaseProjects(fetcher: Fetcher = fetch) {
  if (env.SUPABASE_ACCESS_TOKEN) {
    const response = await fetcher('https://api.supabase.com/v1/projects', { headers: { authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}` } });
    if (response.ok) return await response.json();
  }
  return Array.from(projects.values());
}

export async function connectSupabaseProject(input: { projectRef: string; projectName?: string; organizationId?: string; region?: string; status?: string; providerCredentialId?: string }) {
  const project: SupabaseProject = { id: id('supabase_project'), projectRef: input.projectRef, projectName: input.projectName, organizationId: input.organizationId, region: input.region, status: input.status ?? 'connected', providerCredentialId: input.providerCredentialId, connectedAt: new Date().toISOString() };
  projects.set(project.id, project);
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await getSupabaseAdminClient().from('supabase_projects').insert({ id: stripPrefix(project.id), provider_credential_id: project.providerCredentialId, organization_id: project.organizationId, project_ref: project.projectRef, project_name: project.projectName, region: project.region, status: project.status }).select('*').single();
      if (error) throw error;
      await writeAudit({ actorType: 'admin', action: 'supabase.project_connected', targetType: 'supabase_project', targetId: project.projectRef, status: 'ok' });
      return toProject(data);
    } catch {}
  }
  await writeAudit({ actorType: 'admin', action: 'supabase.project_connected', targetType: 'supabase_project', targetId: project.projectRef, status: 'ok' });
  return project;
}

export async function getConnectedSupabaseProject(projectId: string) {
  if (projects.has(projectId)) return projects.get(projectId)!;
  if (isSupabaseConfigured()) {
    const { data, error } = await getSupabaseAdminClient().from('supabase_projects').select('*').eq('id', stripPrefix(projectId)).single();
    if (!error && data) return toProject(data);
  }
  throw new Error(`Supabase project ${projectId} not found`);
}

export async function readSupabaseProjectSchema(projectId: string) {
  const project = await getConnectedSupabaseProject(projectId);
  if (!isSupabaseConfigured()) return { project, tables: [], note: 'Supabase admin client is not configured in this environment.' };
  const { data, error } = await getSupabaseAdminClient().from('information_schema.tables').select('table_schema,table_name').eq('table_schema', 'public');
  if (error) return { project, tables: [], note: error.message };
  await writeAudit({ actorType: 'admin', action: 'supabase.schema_read', targetType: 'supabase_project', targetId: project.projectRef, status: 'ok' });
  return { project, tables: data ?? [] };
}

export async function generateMigrationDraft(projectId: string, input: { name: string; description: string }) {
  const project = await getConnectedSupabaseProject(projectId);
  const draft = {
    id: id('migration_draft'),
    projectId,
    name: input.name,
    sql: `-- Migration draft for ${project.projectRef}: ${input.name}\n-- ${input.description.replace(/\n/g, ' ')}\n-- Review with Supabase advisors before apply.\n`,
    createdAt: new Date().toISOString(),
  };
  drafts.set(draft.id, draft);
  await writeAudit({ actorType: 'admin', action: 'supabase.migration_draft_created', targetType: 'supabase_project', targetId: project.projectRef, status: 'ok', metadata: { draftId: draft.id } });
  return draft;
}

export async function applyMigrationDraft(projectId: string, draftId: string, approved = false) {
  const project = await getConnectedSupabaseProject(projectId);
  const draft = drafts.get(draftId);
  if (!draft) throw new Error(`Migration draft ${draftId} not found`);
  if (!approved) {
    const approval = await requestApproval({ approvalType: 'production_action', requestedAction: `Apply Supabase migration ${draft.name}`, riskLevel: 'critical', requestedBy: 'admin', reason: 'Production migrations require approval.' });
    await writeAudit({ actorType: 'admin', action: 'supabase.migration_apply_waiting_approval', targetType: 'supabase_project', targetId: project.projectRef, status: 'blocked', metadata: { approvalId: approval.id, draftId } });
    return { ok: false, reason: 'Approval required', approval };
  }
  await writeAudit({ actorType: 'admin', action: 'supabase.migration_apply_approved', targetType: 'supabase_project', targetId: project.projectRef, status: 'ok', metadata: { draftId } });
  return { ok: true, projectId, draftId, applied: false, note: 'Draft approved. Apply with Supabase SQL runner/MCP in production environment.' };
}
