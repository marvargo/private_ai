import { randomUUID } from 'node:crypto';
import { getSupabaseAdminClient, isSupabaseConfigured } from '../repositories/supabaseClient.js';
import { AppError } from '../errors/AppError.js';
import { getDevelopmentInMemoryStores } from '../repositories/index.js';
import { writeAudit } from './orchestrator.js';

export interface Project {
  id: string;
  name: string;
  ownerId?: string;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
}

function id() { return `project_${randomUUID()}`; }
function strip(value: string) { return value.replace(/^project_/, ''); }
function withPrefix(value: string) { return value.startsWith('project_') ? value : `project_${value}`; }
function fromRow(row: any): Project { return { id: withPrefix(row.id), name: row.name, ownerId: row.owner_id ?? undefined, createdAt: row.created_at, updatedAt: row.updated_at, archivedAt: row.archived_at ?? undefined }; }

function notFound(projectId: string) {
  return new AppError({ message: 'Project not found', code: 'PROJECT_NOT_FOUND', statusCode: 404, safeDetails: { projectId } });
}

function assertOwner(project: Project | undefined, ownerId?: string) {
  if (!project) throw notFound('unknown');
  if (!ownerId || project.ownerId !== ownerId) {
    throw new AppError({ message: 'You do not have permission to manage this project', code: 'PROJECT_ACCESS_DENIED', statusCode: 403 });
  }
}

/** Retained only for migration compatibility; user flows must create an explicit project. */
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
    } catch (error) { throw new AppError({ message: 'Failed to list projects', code: 'PROJECTS_LIST_FAILED', statusCode: 503, safeDetails: { ownerId: Boolean(ownerId) }, cause: error }); }
  }
  const { projects } = getDevelopmentInMemoryStores();
  return Array.from(projects.values()).filter((project) => !ownerId || project.ownerId === ownerId).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
}

export async function createProject(input: { name: string; ownerId?: string }) {
  const now = new Date().toISOString();
  const project: Project = { id: id(), name: input.name, ownerId: input.ownerId, createdAt: now, updatedAt: now };
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await getSupabaseAdminClient().from('projects').insert({ id: strip(project.id), name: project.name, owner_id: project.ownerId }).select('*').single();
      if (error) throw error;
      return fromRow(data);
    } catch (error) { throw new AppError({ message: 'Failed to create project', code: 'PROJECT_CREATE_FAILED', statusCode: 503, safeDetails: { ownerId: Boolean(input.ownerId) }, cause: error }); }
  }
  const { projects } = getDevelopmentInMemoryStores();
  projects.set(project.id, project);
  await writeAudit({ actorType: 'system', action: 'project.created', targetType: 'project', targetId: project.id, status: 'ok', metadata: { ownerId: input.ownerId } });
  return project;
}

export async function getProject(projectId: string, ownerId?: string) {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await getSupabaseAdminClient().from('projects').select('*').eq('id', strip(projectId)).maybeSingle();
      if (error) throw error;
      const project = data ? fromRow(data) : undefined;
      assertOwner(project, ownerId);
      return project!;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError({ message: 'Failed to read project', code: 'PROJECT_READ_FAILED', statusCode: 503, safeDetails: { projectId }, cause: error });
    }
  }
  const { projects } = getDevelopmentInMemoryStores();
  const project = projects.get(projectId);
  assertOwner(project, ownerId);
  return project!;
}

export async function updateProject(input: { projectId: string; ownerId?: string; name?: string; archived?: boolean }) {
  const project = await getProject(input.projectId, input.ownerId);
  const updatedAt = new Date().toISOString();
  if (isSupabaseConfigured()) {
    try {
      const changes: Record<string, unknown> = { updated_at: updatedAt };
      if (input.name !== undefined) changes.name = input.name;
      if (input.archived !== undefined) changes.archived_at = input.archived ? updatedAt : null;
      const { data, error } = await getSupabaseAdminClient().from('projects').update(changes).eq('id', strip(project.id)).eq('owner_id', input.ownerId).select('*').single();
      if (error) throw error;
      return fromRow(data);
    } catch (error) { throw new AppError({ message: 'Failed to update project', code: 'PROJECT_UPDATE_FAILED', statusCode: 503, safeDetails: { projectId: input.projectId }, cause: error }); }
  }
  const { projects } = getDevelopmentInMemoryStores();
  const updated: Project = { ...project, name: input.name ?? project.name, archivedAt: input.archived === undefined ? project.archivedAt : input.archived ? updatedAt : undefined, updatedAt };
  projects.set(project.id, updated);
  await writeAudit({ actorType: 'system', action: input.archived ? 'project.archived' : 'project.updated', targetType: 'project', targetId: project.id, status: 'ok' });
  return updated;
}

export async function deleteProject(projectId: string, ownerId?: string) {
  const project = await getProject(projectId, ownerId);
  if (isSupabaseConfigured()) {
    try {
      const { error } = await getSupabaseAdminClient().from('projects').delete().eq('id', strip(project.id)).eq('owner_id', ownerId);
      if (error) throw error;
    } catch (error) { throw new AppError({ message: 'Failed to delete project', code: 'PROJECT_DELETE_FAILED', statusCode: 503, safeDetails: { projectId }, cause: error }); }
  } else {
    const { projects } = getDevelopmentInMemoryStores();
    projects.delete(project.id);
  }
  await writeAudit({ actorType: 'system', action: 'project.deleted', targetType: 'project', targetId: project.id, status: 'ok' });
  return { deleted: true, projectId: project.id };
}
