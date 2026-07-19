import { describe, expect, it, vi } from 'vitest';

describe('orchestrator persistence boundary', () => {
  it('refuses process-memory task fallback in production even when the test flag is set', async () => {
    vi.resetModules();
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('ALLOW_IN_MEMORY_FALLBACK', 'true');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
    const { listTasks } = await import('./orchestrator.js');
    await expect(listTasks()).rejects.toMatchObject({ code: 'PERSISTENCE_REQUIRED', statusCode: 503 });
    vi.unstubAllEnvs();
  });
});
