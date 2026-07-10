import { describe, expect, it, vi } from 'vitest';

describe('credential vault', () => {
  it('redacts stored credentials and blocks raw secret leakage', async () => {
    vi.resetModules();
    vi.stubEnv('ENCRYPTION_KEY', 'test-encryption-key');
    const vault = await import('./credentialVault.js');
    const created = await vault.createCredential({ providerName: 'huggingface', credentialLabel: 'hf prod', value: 'hf_abcdefghijklmnopqrstuvwxyz' });
    expect(created.redactedValue).toBe('hf_a…wxyz');
    expect(JSON.stringify(created)).not.toContain('abcdefghijklmnopqrstuvwxyz');
    expect(await vault.getCredentialSecret(created.id)).toBe('hf_abcdefghijklmnopqrstuvwxyz');
    vi.unstubAllEnvs();
  });

  it('requires explicit approval before deletion', async () => {
    vi.resetModules();
    vi.stubEnv('ENCRYPTION_KEY', 'test-encryption-key');
    const vault = await import('./credentialVault.js');
    const created = await vault.createCredential({ providerName: 'runpod', credentialLabel: 'runpod', value: 'rpa_secret' });
    await expect(vault.deleteCredential(created.id, false)).rejects.toThrow('Explicit approval');
    await expect(vault.deleteCredential(created.id, true)).resolves.toEqual({ ok: true });
    vi.unstubAllEnvs();
  });
});
