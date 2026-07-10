import { describe, expect, it, vi } from 'vitest';

describe('supabase repository configuration', () => {
  it('reports unconfigured when Supabase admin env is absent', async () => {
    vi.resetModules();
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    vi.stubEnv('SUPABASE_URL', '');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
    vi.stubEnv('SUPABASE_SECRET_KEY', '');
    const mod = await import('./supabaseClient.js');
    expect(mod.isSupabaseConfigured()).toBe(false);
    expect(() => mod.getSupabaseAdminClient()).toThrow('Supabase admin client requires');
    vi.unstubAllEnvs();
  });

  it('accepts platform-style SUPABASE_URL and SUPABASE_SECRET_KEY aliases', async () => {
    vi.resetModules();
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
    vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('SUPABASE_SECRET_KEY', 'sb_secret_test');
    const mod = await import('./supabaseClient.js');
    expect(mod.isSupabaseConfigured()).toBe(true);
    vi.unstubAllEnvs();
  });
});
