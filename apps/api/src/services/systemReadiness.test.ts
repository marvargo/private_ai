import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it, vi } from 'vitest';
import { AppError } from '../errors/AppError.js';
import { redactSensitiveObject, redactSensitiveValue } from '../utils/redaction.js';
import { allowInMemoryFallback, isProductionRuntime } from '../utils/runtimeEnvironment.js';
import { checkMigrationFiles, checkRlsPolicyFiles, getSystemReadiness } from './systemReadiness.js';

vi.mock('../utils/env.js', () => ({
  env: {
    NODE_ENV: process.env.NODE_ENV ?? 'test',
    ALLOW_IN_MEMORY_FALLBACK: process.env.ALLOW_IN_MEMORY_FALLBACK ?? 'false',
    RUNPOD_API_KEY: process.env.RUNPOD_API_KEY,
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
  },
}));

describe('Phase 0 readiness baseline', () => {
  it('creates safe AppError instances', () => {
    const error = new AppError({ message: 'Database unavailable', code: 'DATABASE_DOWN', statusCode: 503, safeDetails: { table: 'projects' } });
    expect(error).toBeInstanceOf(Error);
    expect(error.code).toBe('DATABASE_DOWN');
    expect(error.statusCode).toBe(503);
    expect(error.safeDetails).toEqual({ table: 'projects' });
  });

  it('redacts sensitive keys and token-like values recursively', () => {
    const redacted = redactSensitiveObject({
      authorization: 'Bearer abc.def.ghi',
      nested: { apiKey: 'secret-value', harmless: 'visible', prompt: 'private prompt' },
      list: [{ value: 'github_pat_abcdefghijklmnopqrstuvwxyz' }],
    });

    expect(redacted.authorization).toBe('[REDACTED]');
    expect((redacted.nested as Record<string, unknown>).apiKey).toBe('[REDACTED]');
    expect((redacted.nested as Record<string, unknown>).harmless).toBe('visible');
    expect((redacted.list as Array<Record<string, unknown>>)[0].value).toBe('[REDACTED]');
    expect(redactSensitiveValue('normal text')).toBe('normal text');
  });

  it('allows in-memory fallback only through explicit test/development opt-in', () => {
    expect(isProductionRuntime()).toBe(false);
    expect(allowInMemoryFallback()).toBe(process.env.ALLOW_IN_MEMORY_FALLBACK === 'true');
  });

  it('checks contiguous migration files in a supplied directory', () => {
    const dir = join(tmpdir(), `private-ai-readiness-${Date.now()}`);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, '001_initial.sql'), '-- first');
    writeFileSync(join(dir, '002_next.sql'), '-- second');

    expect(checkMigrationFiles(dir).status).toBe('passed');
  });

  it('reports RLS policy coverage from migration SQL', () => {
    const dir = join(tmpdir(), `private-ai-rls-${Date.now()}`);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, '001_rls.sql'), `
      alter table public.projects enable row level security;
      create policy projects_select on public.projects for select using (true);
      alter table public.project_members enable row level security;
      create policy project_members_select on public.project_members for select using (true);
      alter table public.project_invitations enable row level security;
      create policy project_invitations_select on public.project_invitations for select using (true);
      alter table public.project_activity_events enable row level security;
      create policy project_activity_events_select on public.project_activity_events for select using (true);
      alter table public.conversations enable row level security;
      create policy conversations_select on public.conversations for select using (true);
      alter table public.conversation_messages enable row level security;
      create policy conversation_messages_select on public.conversation_messages for select using (true);
      alter table public.capability_usage_events enable row level security;
      create policy capability_usage_events_select on public.capability_usage_events for select using (true);
    `);

    expect(checkRlsPolicyFiles(dir).status).toBe('passed');
  });

  it('returns individual readiness gates instead of a generic status', async () => {
    const report = await getSystemReadiness({
      databaseHealth: async () => ({
        gates: [
          { id: 'supabase.configured', label: 'Supabase configured', ok: true, status: 'passed' },
          { id: 'database.query', label: 'Database query succeeds', ok: true, status: 'passed' },
          { id: 'function:claim_next_ai_task', label: 'Worker lock SQL helper exists', ok: true, status: 'passed' },
        ],
      }),
    });

    expect(report.gates.map((gate) => gate.id)).toContain('database.query');
    expect(report.gates.map((gate) => gate.id)).toContain('migrations.files');
    expect(report.gates.map((gate) => gate.id)).toContain('worker.lock_function');
    expect(report.overallStatus).toBe('not_ready');
  });
});
