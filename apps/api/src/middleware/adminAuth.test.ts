import { describe, expect, it } from 'vitest';
import { authenticateAdmin } from './adminAuth.js';

describe('admin auth middleware policy', () => {
  it('keeps /health public', async () => {
    await expect(authenticateAdmin({ path: '/health', nodeEnv: 'production', supabaseConfigured: false })).resolves.toEqual({ allowed: true });
  });

  it('blocks unauthenticated sensitive routes', async () => {
    const result = await authenticateAdmin({ path: '/settings', nodeEnv: 'production', supabaseConfigured: true });
    expect(result).toEqual({ allowed: false, statusCode: 401, error: 'Supabase admin JWT required' });
  });

  it('blocks non-admin users after JWT validation', async () => {
    const result = await authenticateAdmin(
      { path: '/settings', authorization: 'Bearer valid-token', nodeEnv: 'production', supabaseConfigured: true },
      { verifyJwt: async () => ({ sub: 'user-1', email: 'user@example.com' }), findUserRole: async () => ({ role: 'viewer', email: 'user@example.com' }) },
    );
    expect(result).toEqual({ allowed: false, statusCode: 403, error: 'Admin role required' });
  });

  it('allows admin users after JWT validation and role lookup', async () => {
    const result = await authenticateAdmin(
      { path: '/settings', authorization: 'Bearer valid-token', nodeEnv: 'production', supabaseConfigured: true },
      { verifyJwt: async () => ({ sub: 'admin-1', email: 'admin@example.com' }), findUserRole: async () => ({ role: 'admin', email: 'admin@example.com' }) },
    );
    expect(result).toEqual({ allowed: true, identity: { userId: 'admin-1', email: 'admin@example.com', role: 'admin' } });
  });

  it('allows ADMIN_API_KEY fallback only outside production', async () => {
    const development = await authenticateAdmin({ path: '/settings', adminApiKeyHeader: 'local-key', adminApiKey: 'local-key', nodeEnv: 'development', supabaseConfigured: false });
    const production = await authenticateAdmin({ path: '/settings', adminApiKeyHeader: 'local-key', adminApiKey: 'local-key', nodeEnv: 'production', supabaseConfigured: false });

    expect(development).toEqual({ allowed: true, usedFallbackAdminApiKey: true });
    expect(production).toEqual({ allowed: false, statusCode: 401, error: 'Supabase admin JWT required' });
  });
});
