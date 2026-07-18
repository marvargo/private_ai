import { randomUUID } from 'node:crypto';
import { getSupabaseAdminClient, isSupabaseConfigured } from '../repositories/supabaseClient.js';
import { writeAudit } from './orchestrator.js';

export interface Project {
  id: string;
  name: string;
  ownerId?: string;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
}

const projects = new Map<string, Project>();
function id() { return `project_${randomUUID()}`; }
function strip(value: string) { return value.replace(/^project_/, ''); }
function withPrefix(value: string) { return value.startsWith('project_') ? value : `project_${value}`; }
function fromRow(row: any): Project { return { id: withPrefix(row.id), name: row.name, ownerId: row.owner_id ?? undefined, createdAt: row.created_at, updatedAt: row.updated_at, archivedAt: row.archived_at ?? undefined }; }

export async function ensureDefaultProject(ownerId?: string) {
  const existing = (await listProjects(ownerId)).find((project) => !project.archivedAt);
  if (existing) return existing;
  return createProject({ name: 'My Project', ownerId });
}

export async function listProjects(ownerId?: string) {
  if (isSupabaseConfigured()) {
    try {
      let query = getSupabaseAdminClient().from('projects').select('*').is('archived_at', null).order('updated_at', { ascending: false });
      if (ownerId) query = query.eq('owner_id', ownerId);
      const { data, error } = await query.limit(100);
      if (error) throw error;
      return (data ?? []).map(fromRow);
    } catch { /* local fallback */ }
  }
  return Array.from(projects.values()).filter((project) => !ownerId || project.ownerId === ownerId).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
}

export async function createProject(input: { name: string; ownerId?: string }) {
  const now = new Date().toISOString();
  const project: Project = { id: id(), name: input.name, ownerId: input.ownerId, createdAt: now, updatedAt: now };
  projects.set(project.id, project);
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await getSupabaseAdminClient().from('projects').insert({ id: strip(project.id), name: project.name, owner_id: project.ownerId }).select('*').single();
      if (error) throw error;
      return fromRow(data);
    } catch { /* local fallback */ }
  }
  await writeAudit({ actorType: 'system', action: 'project.created', targetType: 'project', targetId: project.id, status: 'ok', metadata: { ownerId: input.ownerId } });
  return project;
}
