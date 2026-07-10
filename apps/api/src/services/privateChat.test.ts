import { describe, expect, it } from 'vitest';
import { privateChatCompletion } from './privateChat.js';
import { listConversationMessages } from './conversations.js';
import { listModelRegistry, updateModelRuntimeStatus } from './modelRegistry.js';

const fakeFetch = async () => ({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content: 'private answer' } }] }) }) as any;

describe('private chat', () => {
  it('stores conversation messages and uses private model endpoint', async () => {
    const model = listModelRegistry().find((entry) => entry.modelRole === 'business_reasoning')!;
    updateModelRuntimeStatus(model.id, 'healthy', 'http://private-llama.test');
    const result = await privateChatCompletion({ messages: [{ role: 'user', content: 'hello' }], modelRole: 'business_reasoning', fetch: fakeFetch });
    expect(result.privateModelOnly).toBe(true);
    const stored = await listConversationMessages(result.conversationId);
    expect(stored.map((message) => message.role)).toContain('assistant');
  });

  it('blocks external providers by default', async () => {
    const model = listModelRegistry().find((entry) => entry.modelRole === 'coding')!;
    updateModelRuntimeStatus(model.id, 'healthy', 'https://api.openai.com');
    await expect(privateChatCompletion({ messages: [{ role: 'user', content: 'no external' }], modelRole: 'coding', taskType: 'app_development', fetch: fakeFetch })).rejects.toThrow(/External model providers are disabled/);
  });
});
