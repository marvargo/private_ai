import { describe, expect, it } from 'vitest';
import { createProject } from './projects.js';
import { acceptProjectInvitation, addProjectMember, createProjectInvitation, createInitiative, favoriteProject, getProjectDashboard, listProjectCards, recordProjectActivity } from './projectDashboard.js';
import { addConversationMessage, createConversation } from './conversations.js';

describe('project dashboard collaboration', () => {
  it('allows project owners and collaborators but denies non-members', async () => {
    const project = await createProject({ name: 'Dashboard Test', ownerId: 'owner-a' });
    await expect(getProjectDashboard(project.id, 'owner-a')).resolves.toMatchObject({ header: { currentUserRole: 'owner' } });
    await addProjectMember({ projectId: project.id, userId: 'collab-a', displayName: 'Collaborator', role: 'collaborator' });
    await expect(getProjectDashboard(project.id, 'collab-a')).resolves.toMatchObject({ header: { currentUserRole: 'collaborator' } });
    await expect(getProjectDashboard(project.id, 'stranger')).rejects.toThrow('Project access denied');
  });

  it('supports viewer restrictions and co-admin invitations', async () => {
    const project = await createProject({ name: 'Invitation Test', ownerId: 'owner-b' });
    const invite = await createProjectInvitation({ projectId: project.id, email: 'teammate@example.com', role: 'viewer', invitedBy: 'owner-b' });
    const member = await acceptProjectInvitation({ invitationId: invite.id, userId: 'viewer-b', displayName: 'Viewer' });
    expect(member.role).toBe('viewer');
    await addProjectMember({ projectId: project.id, userId: 'admin-b', displayName: 'Co Admin', role: 'co-admin' });
    await expect(createProjectInvitation({ projectId: project.id, email: 'new@example.com', role: 'member', invitedBy: 'admin-b' })).resolves.toMatchObject({ status: 'pending' });
  });

  it('groups owned, shared, and favorite project cards with scoped counts', async () => {
    const owned = await createProject({ name: 'Owned Cards', ownerId: 'owner-c' });
    const shared = await createProject({ name: 'Shared Cards', ownerId: 'owner-d' });
    await addProjectMember({ projectId: shared.id, userId: 'owner-c', displayName: 'Owner C', role: 'member' });
    await favoriteProject(owned.id, 'owner-c', true);
    const cards = await listProjectCards('owner-c');
    expect(cards.ownedByMe.some((card) => card.id === owned.id)).toBe(true);
    expect(cards.sharedWithMe.some((card) => card.id === shared.id)).toBe(true);
    expect(cards.favorites.some((card) => card.id === owned.id)).toBe(true);
  });

  it('filters activity by project and redacts prompt-like contents', async () => {
    const project = await createProject({ name: 'Activity Test', ownerId: 'owner-e' });
    const other = await createProject({ name: 'Other Activity Test', ownerId: 'owner-e' });
    await recordProjectActivity({ projectId: project.id, actorName: 'Anna', actorType: 'user', action: 'updated prompt: secret launch plan', targetTitle: 'Website Launch Plan', projectSection: 'Chat', status: 'ok', visibility: 'project' });
    await recordProjectActivity({ projectId: other.id, actorName: 'John', actorType: 'user', action: 'updated other project', targetTitle: 'Other', projectSection: 'Coding', status: 'ok', visibility: 'project' });
    const dashboard = await getProjectDashboard(project.id, 'owner-e');
    expect(dashboard.recentActivity).toHaveLength(1);
    expect(JSON.stringify(dashboard.recentActivity)).not.toContain('secret launch plan');
    expect(JSON.stringify(dashboard.recentActivity)).not.toContain('Other');
  });

  it('excludes standalone content and never returns private conversation contents', async () => {
    const project = await createProject({ name: 'Privacy Test', ownerId: 'owner-f' });
    const linked = await createConversation({ title: 'Shared chat', createdBy: 'owner-f', projectId: project.id });
    await addConversationMessage({ conversationId: linked.id, role: 'user', content: 'private prompt body', ownerId: 'owner-f' });
    await createConversation({ title: 'Standalone chat', createdBy: 'owner-f', standalone: true });
    const dashboard = await getProjectDashboard(project.id, 'owner-f');
    expect(JSON.stringify(dashboard)).toContain('Shared chat');
    expect(JSON.stringify(dashboard)).not.toContain('Standalone chat');
    expect(JSON.stringify(dashboard)).not.toContain('private prompt body');
  });

  it('surfaces initiatives and realtime topics for dashboard updates', async () => {
    const project = await createProject({ name: 'Initiative Test', ownerId: 'owner-g' });
    await createInitiative({ projectId: project.id, name: 'Launch site', ownerName: 'Owner', status: 'in_progress', progress: 45, contributors: ['Owner'], blockers: [] });
    const dashboard = await getProjectDashboard(project.id, 'owner-g');
    expect(dashboard.currentInitiatives[0]).toMatchObject({ name: 'Launch site', progress: 45 });
    expect(dashboard.realtimeTopics).toContain(`project:${project.id}:activity`);
  });
});
