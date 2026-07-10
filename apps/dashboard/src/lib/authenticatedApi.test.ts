import { describe, expect, it } from 'vitest';
import { authenticatedFetch, backendSecretEnvNamesForTest } from './authenticatedApi';

describe('authenticated dashboard API client', () => {
  it('sends bearer authorization and JSON content type', async () => {
    let request: Request | undefined;
    const response = await authenticatedFetch('/status', { method: 'POST', json: { ok: true } }, {
      getAccessToken: async () => 'jwt-token',
      fetchImpl: async (input, init) => {
        request = new Request(input, init);
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      },
    });

    expect(response.ok).toBe(true);
    expect(request?.headers.get('authorization')).toBe('Bearer jwt-token');
    expect(request?.headers.get('content-type')).toBe('application/json');
    expect(await request?.text()).toBe(JSON.stringify({ ok: true }));
  });

  it('redirects unauthenticated users to login', async () => {
    let redirected = false;
    await expect(authenticatedFetch('/status', {}, { getAccessToken: async () => undefined, redirectToLogin: () => { redirected = true; } })).rejects.toThrow('Authentication required');
    expect(redirected).toBe(true);
  });

  it('tracks backend-only secret names so scans can assert they are absent from dashboard source', () => {
    expect(backendSecretEnvNamesForTest()).toEqual(expect.arrayContaining(['RUNPOD_API_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'ENCRYPTION_KEY']));
  });
});
