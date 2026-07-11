import { afterEach, describe, expect, it, vi } from 'vitest';
import { chatWithPrivateModel } from './modelClient.js';
import { updateModelRuntimeStatusByRoleFamily } from './modelRegistry.js';

describe('model client private endpoint routing', () => {
  afterEach(() => vi.unstubAllEnvs());

  function okFetch(assertUrl: (url: string) => void, assertHeaders?: (headers: HeadersInit | undefined) => void) {
    return vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      assertUrl(String(url));
      assertHeaders?.(init?.headers);
      return new Response(JSON.stringify({ choices: [{ message: { role: 'assistant', content: 'ok' } }] }), { status: 200, headers: { 'content-type': 'application/json' } });
    }) as unknown as typeof fetch;
  }

  it('uses TEST_MODEL_SERVER_URL and TEST_MODEL_SERVER_API_KEY for test family', async () => {
    vi.stubEnv('USE_SMALL_TEST_FOR_QA', 'true');
    vi.stubEnv('TEST_MODEL_SERVER_URL', 'https://test.example');
    vi.stubEnv('TEST_MODEL_SERVER_API_KEY', 'test-key');
    updateModelRuntimeStatusByRoleFamily('qa', 'test', 'healthy');
    await chatWithPrivateModel([{ role: 'user', content: 'hi' }], {
      taskType: 'small_test_validation',
      modelRole: 'qa',
      fetch: okFetch(
        (url) => expect(url).toBe('https://test.example/v1/chat/completions'),
        (headers) => expect((headers as Record<string, string>).authorization).toBe('Bearer test-key'),
      ),
    });
  });

  it('keeps qwen private endpoint routing', async () => {
    vi.stubEnv('USE_SMALL_TEST_FOR_QA', 'false');
    vi.stubEnv('RUNPOD_SMALL_TEST_MODE', 'mock');
    vi.stubEnv('QWEN_SERVER_URL', 'https://qwen.example');
    vi.stubEnv('QWEN_SERVER_API_KEY', 'qwen-key');
    updateModelRuntimeStatusByRoleFamily('qa', 'qwen', 'healthy');
    await chatWithPrivateModel([{ role: 'user', content: 'hi' }], {
      taskType: 'test_creation',
      modelRole: 'qa',
      fetch: okFetch((url) => expect(url).toBe('https://qwen.example/v1/chat/completions')),
    });
  });

  it('keeps llama private endpoint routing', async () => {
    vi.stubEnv('LLAMA_SERVER_URL', 'https://llama.example');
    vi.stubEnv('LLAMA_SERVER_API_KEY', 'llama-key');
    updateModelRuntimeStatusByRoleFamily('business_reasoning', 'llama', 'healthy', 'https://llama.example');
    await chatWithPrivateModel([{ role: 'user', content: 'hi' }], {
      taskType: 'business_strategy',
      modelRole: 'business_reasoning',
      fetch: okFetch((url) => expect(url).toBe('https://llama.example/v1/chat/completions')),
    });
  });

  it('blocks external model providers by default', async () => {
    vi.stubEnv('LLAMA_SERVER_URL', 'https://api.openai.com');
    updateModelRuntimeStatusByRoleFamily('business_reasoning', 'llama', 'healthy', 'https://api.openai.com');
    await expect(chatWithPrivateModel([{ role: 'user', content: 'hi' }], { modelRole: 'business_reasoning' })).rejects.toThrow('External model providers are disabled');
  });
});
