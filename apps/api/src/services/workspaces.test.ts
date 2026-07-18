import { describe, expect, it } from 'vitest';
import { createWorkspaceRecord, listWorkspaceRecords, usageSummary } from './workspaces.js';

describe('white-label workspace records', () => {
  it('keeps workspace records project and owner scoped', async () => {
    const created = await createWorkspaceRecord({ kind: 'code_project', ownerId: 'user-a', projectId: 'project_a', name: 'App build', capability: 'coding', category: 'software' });
    expect(created.name).toBe('App build');
    await createWorkspaceRecord({ kind: 'code_project', ownerId: 'user-b', projectId: 'project_b', name: 'Other build', capability: 'coding', category: 'software' });
    const owned = await listWorkspaceRecords('code_project', 'user-a', 'project_a');
    expect(owned.map((record) => record.name)).toEqual(['App build']);
  });

  it('summarizes aggregate analytics without prompt text', async () => {
    const summary = await usageSummary('user-a');
    expect(summary).toEqual({ events: 0, byCapability: {} });
  });
});
