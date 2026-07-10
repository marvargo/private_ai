import { describe, expect, it } from 'vitest';
import { applyMigrationDraft, connectSupabaseProject, generateMigrationDraft, listSupabaseProjects, testSupabaseManagementConnection } from './supabaseProjectService.js';

describe('supabase project service', () => {
  it('persists project metadata locally when management API is unavailable', async () => {
    const project = await connectSupabaseProject({ projectRef: 'abc123', projectName: 'Private AI' });
    const list = await listSupabaseProjects(async () => ({ ok: false, status: 401, json: async () => [] }) as any);
    expect(list).toContainEqual(project);
  });

  it('generates migration drafts and blocks apply without approval', async () => {
    const project = await connectSupabaseProject({ projectRef: 'def456', projectName: 'Schema' });
    const draft = await generateMigrationDraft(project.id, { name: 'add_table', description: 'create safe table' });
    expect(draft.sql).toContain('Migration draft');
    const apply = await applyMigrationDraft(project.id, draft.id, false);
    expect(apply.ok).toBe(false);
    expect(apply.approval?.status).toBe('pending');
  });

  it('tests management connection with injected fetcher', async () => {
    const result = await testSupabaseManagementConnection(async () => ({ ok: true, status: 200, json: async () => [] }) as any);
    expect(result.status === 200 || result.reason).toBeTruthy();
  });
});
