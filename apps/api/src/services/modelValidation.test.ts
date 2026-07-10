import { describe, expect, it } from 'vitest';
import { validatePrivateModelRuntime } from './modelValidation.js';

describe('private model runtime validation', () => {
  it('passes against a mocked OpenAI-compatible endpoint', async () => {
    const result = await validatePrivateModelRuntime({
      endpointUrl: 'https://private-model.test',
      expectedModel: 'test-model',
      stream: true,
      fetch: async (url, init) => {
        const target = String(url);
        if (target.endsWith('/v1/models')) return new Response(JSON.stringify({ data: [{ id: 'test-model' }] }), { status: 200 });
        if (target.endsWith('/v1/chat/completions') && String(init?.body).includes('"stream":true')) return new Response('data: {"choices":[{"delta":{"content":"ok"}}]}', { status: 200 });
        return new Response(JSON.stringify({ choices: [{ message: { content: 'private model runtime ok' } }] }), { status: 200 });
      },
    });

    expect(result.ok).toBe(true);
    expect(result.models.modelIds).toContain('test-model');
    expect(result.chat.text).toContain('private model runtime ok');
    expect(result.streaming.supported).toBe(true);
  });
});
