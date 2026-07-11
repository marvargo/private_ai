
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getProviderSecret } from './credentialResolver.js';

describe('credential resolver env fallback', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('uses provider env fallback without returning plaintext in requirements', async () => {
    vi.stubEnv('RUNPOD_API_KEY', 'unit-runpod-key');
    await expect(getProviderSecret('runpod')).resolves.toBe('unit-runpod-key');
  });

  it('throws a clean missing credential error', async () => {
    vi.stubEnv('RUNPOD_API_KEY', '');
    await expect(getProviderSecret('runpod')).rejects.toThrow('Missing runpod credential');
  });
});
