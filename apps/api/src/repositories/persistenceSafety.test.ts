import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { AppError } from '../errors/AppError.js';
import { ProjectRepository } from './projectRepository.js';

const auditedServiceFiles = [
  'projects.ts',
  'conversations.ts',
  'projectDashboard.ts',
  'workspaces.ts',
  'orchestrator.ts',
  'approvals.ts',
  'runpodLifecycle.ts',
  'privateChat.ts',
];

describe('production persistence safety', () => {
  it('keeps Map and Set persistence out of production service modules', () => {
    for (const file of auditedServiceFiles) {
      const source = readFileSync(join(process.cwd(), 'src/services', file), 'utf8');
      expect(source, `${file} must not instantiate process-local persistence`).not.toMatch(/new\s+(Map|Set)\s*</);
      expect(source, `${file} must not keep local fallback comments`).not.toMatch(/local fallback|fallback below|Fall back/i);
    }
  });

  it('keeps in-memory persistence isolated to repository testing utilities', () => {
    const source = readFileSync(join(process.cwd(), 'src/repositories/testing/inMemoryRepositories.ts'), 'utf8');
    expect(source).toMatch(/new Map/);
    expect(source).toMatch(/new Set/);
  });

  it('converts Supabase failures into safe AppError failures', async () => {
    const client = {
      from: () => ({
        select: () => ({
          limit: async () => ({ data: null, error: { message: 'connection refused', details: 'internal' } }),
        }),
      }),
    } as never;
    const repository = new ProjectRepository(client);

    await expect(repository.list()).rejects.toMatchObject({
      name: 'AppError',
      code: 'PROJECTS_LIST_FAILED',
      statusCode: 503,
    } satisfies Partial<AppError>);
  });
});
