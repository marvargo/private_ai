import { describe, expect, it, vi } from 'vitest';
import { checkHuggingFaceModelAccess } from './huggingface.js';

describe('huggingface access checks', () => {
  it('requires a token before checking gated model access', async () => {
    await expect(checkHuggingFaceModelAccess('meta-llama/Meta-Llama-3.1-405B-Instruct', '')).resolves.toMatchObject({ ok: false });
  });

  it('normalizes successful model metadata without exposing token', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify({ gated: 'manual', private: false, sha: 'abc', siblings: [{ rfilename: 'config.json' }] }), { status: 200 }));
    const result = await checkHuggingFaceModelAccess('meta-llama/Meta-Llama-3.1-405B-Instruct', 'test-token');
    expect(result).toMatchObject({ ok: true, gated: 'manual', private: false, siblingCount: 1 });
    expect(JSON.stringify(result)).not.toContain('test-token');
    fetchMock.mockRestore();
  });
});
