import { describe, expect, it, vi } from 'vitest';

describe('supabase diagnostics', () => {
  it('flags publishable keys as not service-role secrets', async () => {
    vi.resetModules();
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'sb_publishable_test');
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 404 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 401 }));
    const { diagnoseSupabase } = await import('./supabase.js');
    const result = await diagnoseSupabase();
    expect(result.keyLooksPublishable).toBe(true);
    expect(result.authAdminAvailable).toBe(false);
    expect(result.issues.join(' ')).toContain('publishable');
    fetchMock.mockRestore();
    vi.unstubAllEnvs();
  });
});
