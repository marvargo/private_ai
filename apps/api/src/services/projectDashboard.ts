import { randomUUID } from 'node:crypto';
import { getSupabaseAdminClient, isSupabaseConfigured } from '../repositories/supabaseClient.js';
import { writeAudit } from './orchestrator.js';
import { listConversations } from './conversations.js';
import { listProjects, Project } from './projects.js';
import { listWorkspaceRecords, usageSummary } from './workspaces.js';

export type ProjectRole = 'owner' | 'co-admin' | 'collaborator' | 'member' | 'viewer';
export type ProjectPermission = 'view_project' | 'manage_project' | 'invite_member' | 'create_content' | 'approve_requests' | 'view_costs';

type ActivityVisibility = 'project' | 'restricted';

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  displayName: string;
  role: ProjectRole;
  avatarUrl?: string;
  lastActivityAt?: string;
  invitationStatus?: 'accepted' | 'pending';
}

export interface ProjectInvitation {
  id: string;
  projectId: string;
  email: string;
  role: ProjectRole;
  invitedBy: string;
  message?: string;
  status: 'pending' | 'accepted' | 'revoked' | 'expired';
  expiresAt: string;
  createdAt: string;
}

export interface ProjectActivityEvent {
  id: string;
  projectId: string;
  actorName: string;
  actorType: 'user' | 'ai' | 'workflow' | 'integration' | 'system';
  action: string;
  targetTitle: string;
  projectSection: string;
  status: string;
  visibility: ActivityVisibility;
  createdAt: string;
  link?: string;
}

export interface ProjectInitiative {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  ownerName: string;
  status: 'not_started' | 'in_progress' | 'blocked' | 'completed';
  progress: number;
  targetDate?: string;
  contributors: string[];
  blockers: string[];
}

const members = new Map<string, ProjectMember>();
const invitations = new Map<string, ProjectInvitation>();
const activities = new Map<string, ProjectActivityEvent>();
const initiatives = new Map<string, ProjectInitiative>();
const favorites = new Set<string>();

const rolePermissions: Record<ProjectRole, ProjectPermission[]> = {
  owner: ['view_project', 'manage_project', 'invite_member', 'create_content', 'approve_requests', 'view_costs'],
  'co-admin': ['view_project', 'manage_project', 'invite_member', 'create_content', 'approve_requests', 'view_costs'],
  collaborator: ['view_project', 'create_content'],
  member: ['view_project'],
  viewer: ['view_project'],
};

function id(prefix: string) { return `${prefix}_${randomUUID()}`; }
function strip(value?: string) { return value?.replace(/^[a-z_]+_/, ''); }
function now() { return new Date().toISOString(); }
function memberKey(projectId: string, userId: string) { return `${projectId}:${userId}`; }
function favoriteKey(projectId: string, userId: string) { return `${projectId}:${userId}`; }

function sanitizeActivity(input: Omit<ProjectActivityEvent, 'id' | 'createdAt'>): ProjectActivityEvent {
  const scrub = (value: string) => value.replace(/prompt\s*:.*/gi, '[redacted]').replace(/token\s*:.*/gi, '[redacted]').replace(/secret\s*:.*/gi, '[redacted]').slice(0, 160);
  return { ...input, id: id('activity'), action: scrub(input.action), targetTitle: scrub(input.targetTitle), createdAt: now() };
}

export function permissionsForRole(role: ProjectRole) {
  return rolePermissions[role];
}

export async function ensureProjectOwnerMembership(project: Project) {
  if (!project.ownerId) return;
  const key = memberKey(project.id, project.ownerId);
  if (!members.has(key)) members.set(key, { id: id('member'), projectId: project.id, userId: project.ownerId, displayName: 'Project owner', role: 'owner', lastActivityAt: project.updatedAt, invitationStatus: 'accepted' });
}

export async function getProjectMembership(projectId: string, userId?: string) {
  if (!userId) return undefined;
  const local = members.get(memberKey(projectId, userId));
  if (local) return local;
  const project = (await listProjects()).find((item) => item.id === projectId);
  if (project?.ownerId === userId) {
    await ensureProjectOwnerMembership(project);
    return members.get(memberKey(projectId, userId));
  }
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await getSupabaseAdminClient().from('project_members').select('*').eq('project_id', strip(projectId)).eq('user_id', userId).maybeSingle();
      if (error) throw error;
      if (data) return { id: `member_${data.id}`, projectId, userId, displayName: data.display_name ?? 'Project member', role: data.role, avatarUrl: data.avatar_url ?? undefined, lastActivityAt: data.last_activity_at ?? undefined, invitationStatus: 'accepted' } as ProjectMember;
    } catch { /* local fallback */ }
  }
  return undefined;
}

export async function requireProjectMembership(projectId: string, userId?: string) {
  const membership = await getProjectMembership(projectId, userId);
  if (!membership) throw new Error('Project access denied');
  return membership;
}

export async function addProjectMember(input: { projectId: string; userId: string; displayName: string; role: ProjectRole }) {
  const member: ProjectMember = { id: id('member'), invitationStatus: 'accepted', lastActivityAt: now(), ...input };
  members.set(memberKey(input.projectId, input.userId), member);
  return member;
}

export async function createProjectInvitation(input: { projectId: string; email: string; role: ProjectRole; invitedBy: string; message?: string }) {
  const inviter = await requireProjectMembership(input.projectId, input.invitedBy);
  if (!permissionsForRole(inviter.role).includes('invite_member')) throw new Error('Invite permission required');
  const invitation: ProjectInvitation = { id: id('invitation'), projectId: input.projectId, email: input.email, role: input.role, invitedBy: input.invitedBy, message: input.message, status: 'pending', createdAt: now(), expiresAt: new Date(Date.now() + 7 * 24 * 3600_000).toISOString() };
  invitations.set(invitation.id, invitation);
  await recordProjectActivity({ projectId: input.projectId, actorName: inviter.displayName, actorType: 'user', action: 'invited a teammate', targetTitle: input.email, projectSection: 'team', status: 'pending', visibility: 'project', link: `/projects/${input.projectId}` });
  await writeAudit({ actorType: 'system', action: 'project.invitation.created', targetType: 'project_invitation', targetId: invitation.id, status: 'ok', metadata: { projectId: input.projectId, role: input.role } });
  return invitation;
}

export async function acceptProjectInvitation(input: { invitationId: string; userId: string; displayName: string }) {
  const invitation = invitations.get(input.invitationId);
  if (!invitation || invitation.status !== 'pending') throw new Error('Invitation is not pending');
  if (new Date(invitation.expiresAt).getTime() < Date.now()) {
    invitation.status = 'expired';
    throw new Error('Invitation expired');
  }
  invitation.status = 'accepted';
  return addProjectMember({ projectId: invitation.projectId, userId: input.userId, displayName: input.displayName, role: invitation.role });
}

export async function recordProjectActivity(input: Omit<ProjectActivityEvent, 'id' | 'createdAt'>) {
  const event = sanitizeActivity(input);
  activities.set(event.id, event);
  return event;
}

export async function createInitiative(input: Omit<ProjectInitiative, 'id'>) {
  const initiative = { ...input, id: id('initiative') };
  initiatives.set(initiative.id, initiative);
  return initiative;
}

export async function favoriteProject(projectId: string, userId: string, favorite: boolean) {
  const key = favoriteKey(projectId, userId);
  if (favorite) favorites.add(key);
  else favorites.delete(key);
  return { projectId, favorite };
}

export async function listProjectCards(userId?: string) {
  const owned = await listProjects(userId);
  for (const project of owned) await ensureProjectOwnerMembership(project);
  const memberProjects = Array.from(members.values()).filter((member) => member.userId === userId).map((member) => member.projectId);
  const visibleProjects = (await listProjects()).filter((project) => owned.some((own) => own.id === project.id) || memberProjects.includes(project.id));
  const all = Array.from(new Map<string, Project>(visibleProjects.map((project) => [project.id, project] as [string, Project])).values());
  const cards = await Promise.all(all.map(async (project) => {
    const memberList = Array.from(members.values()).filter((member) => member.projectId === project.id);
    const chats = (await listConversations(userId, project.id)).length;
    const codeProjects = (await listWorkspaceRecords('code_project', userId, project.id)).length;
    const workflows = (await listWorkspaceRecords('workflow', userId, project.id)).length;
    const integrations = (await listWorkspaceRecords('integration', userId, project.id)).length;
    const assets = (await listWorkspaceRecords('studio_asset', userId, project.id)).length;
    const role = memberList.find((member) => member.userId === userId)?.role ?? (project.ownerId === userId ? 'owner' : 'viewer');
    return { id: project.id, name: project.name, projectType: 'Workspace', description: 'Collaborative private AI project', status: project.archivedAt ? 'archived' : 'active', owner: project.ownerId === userId ? 'Me' : 'Project owner', currentUserRole: role, memberCount: memberList.length || (project.ownerId ? 1 : 0), lastActivity: project.updatedAt, favorite: Boolean(userId && favorites.has(favoriteKey(project.id, userId))), health: 'Healthy', counts: { chats, images: assets, videos: 0, codeProjects, workflows, integrations, documents: 0 }, pendingApprovals: 0 };
  }));
  return { recent: cards, ownedByMe: cards.filter((card) => card.currentUserRole === 'owner'), sharedWithMe: cards.filter((card) => card.currentUserRole !== 'owner'), favorites: cards.filter((card) => card.favorite), archived: cards.filter((card) => card.status === 'archived') };
}

export async function getProjectDashboard(projectId: string, userId?: string) {
  const membership = await requireProjectMembership(projectId, userId);
  const project = (await listProjects()).find((item) => item.id === projectId) ?? (await listProjects(userId)).find((item) => item.id === projectId);
  if (!project) throw new Error('Project not found');
  const memberList = Array.from(members.values()).filter((member) => member.projectId === projectId);
  const invited = Array.from(invitations.values()).filter((invitation) => invitation.projectId === projectId && invitation.status === 'pending');
  const projectActivities = Array.from(activities.values()).filter((event) => event.projectId === projectId && event.visibility === 'project').sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0, 20);
  const projectInitiatives = Array.from(initiatives.values()).filter((initiative) => initiative.projectId === projectId);
  const chats = (await listConversations(userId, projectId)).filter((chat) => chat.projectId === projectId);
  const codeProjects = await listWorkspaceRecords('code_project', userId, projectId);
  const workflows = await listWorkspaceRecords('workflow', userId, projectId);
  const integrations = await listWorkspaceRecords('integration', userId, projectId);
  const assets = await listWorkspaceRecords('studio_asset', userId, projectId);
  const summary = await usageSummary(userId, projectId);
  return {
    header: { projectId, name: project.name, projectType: 'Workspace', description: 'Collaborative private AI project', status: project.archivedAt ? 'archived' : 'active', cover: '#0f172a', owner: project.ownerId === userId ? 'Me' : 'Project owner', currentUserRole: membership.role, memberCount: memberList.length || 1, invitedMemberCount: invited.length, lastActivity: project.updatedAt, favorite: Boolean(userId && favorites.has(favoriteKey(projectId, userId))) },
    myWork: [...chats.slice(0, 3).map((chat) => ({ title: chat.title, type: 'chat', status: 'active', projectArea: 'Chat', lastUpdated: chat.updatedAt, collaborators: [membership.displayName], quickAction: 'Open' })), ...codeProjects.slice(0, 3).map((item) => ({ title: item.name, type: 'coding', status: item.status, projectArea: 'Coding', lastUpdated: item.updatedAt, collaborators: [membership.displayName], quickAction: 'Open' }))],
    teamActivity: projectActivities,
    currentInitiatives: projectInitiatives,
    recentActivity: projectActivities,
    aiAndWorkflowActivity: [...workflows.map((workflow) => ({ friendlyName: workflow.name, capability: 'Workflow', status: workflow.status, owner: membership.displayName, outputType: 'Automation' })), ...codeProjects.map((code) => ({ friendlyName: code.name, capability: 'Coding', status: code.status, owner: membership.displayName, outputType: 'Code' }))],
    pendingApprovals: [],
    recentAssetsAndOutputs: [...assets, ...codeProjects, ...workflows, ...integrations].slice(0, 12),
    projectHealth: { status: 'Healthy', integrationsConnected: integrations.length, integrationsRequiringAttention: 0, failedWorkflows: 0, unresolvedApprovals: 0, overdueWork: 0, storageUsage: '0 MB', automationHealth: 'Healthy', activeIncidents: 0, securityWarnings: 0, teamInvitationsPending: invited.length },
    usageAndCostSummary: { ...summary, currentMonthUsage: summary.events, comparisonWithPreviousPeriod: 'No previous period yet', estimatedProjectCost: 0, actualReconciledCost: 0 },
    upcomingItems: [],
    quickActions: ['New chat', 'Generate image', 'Create video', 'Start coding project', 'Create workflow', 'Connect tool', 'Upload file', 'Invite teammate', 'Add initiative', 'Create task'],
    team: { owner: memberList.find((member) => member.role === 'owner'), coAdministrators: memberList.filter((member) => member.role === 'co-admin'), collaborators: memberList.filter((member) => member.role === 'collaborator'), members: memberList.filter((member) => member.role === 'member' || member.role === 'viewer'), pendingInvitations: invited },
    realtimeTopics: [`project:${projectId}:activity`, `project:${projectId}:approvals`, `project:${projectId}:assets`],
  };
}
