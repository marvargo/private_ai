import { ModelRole } from '@wyndme/shared';
import { chatWithPrivateModel } from './modelClient.js';
import { addConversationMessage, createConversation, getConversation, listConversationMessages } from './conversations.js';
import { writeAudit } from './orchestrator.js';

export interface ChatCompletionInput {
  conversationId?: string;
  messages: Array<{ role: string; content: string }>;
  modelRole?: ModelRole;
  taskType?: string;
  temperature?: number;
  max_tokens?: number;
  systemPrompt?: string;
  fetch?: typeof fetch;
}

function assistantText(payload: any) {
  return payload?.choices?.[0]?.message?.content ?? payload?.choices?.[0]?.delta?.content ?? '';
}

export async function privateChatCompletion(input: ChatCompletionInput) {
  const conversation = input.conversationId ? await getConversation(input.conversationId) : await createConversation({ title: input.messages.find((message) => message.role === 'user')?.content?.slice(0, 80) || 'Private chat', modelRole: input.modelRole ?? 'auto' });
  if (!conversation) throw new Error(`Conversation ${input.conversationId} not found`);

  for (const message of input.messages) {
    if (message.role === 'user' || message.role === 'system') {
      await addConversationMessage({ conversationId: conversation.id, role: message.role as 'user' | 'system', content: message.content });
    }
  }

  const history = await listConversationMessages(conversation.id);
  const completion = await chatWithPrivateModel(history.map((message) => ({ role: message.role, content: message.content })), input);
  const content = assistantText(completion);
  await addConversationMessage({ conversationId: conversation.id, role: 'assistant', content, modelName: completion.modelRouting?.modelName, metadata: { modelRouting: completion.modelRouting } });
  await writeAudit({ actorType: 'admin', action: 'chat.completion', targetType: 'conversation', targetId: conversation.id, status: 'ok', metadata: completion.modelRouting });
  return { conversationId: conversation.id, privateModelOnly: true, ...completion };
}

export async function privateChatCompletionStream(input: ChatCompletionInput) {
  const completion = await privateChatCompletion(input);
  return { event: 'message', data: completion, privateModelOnly: true };
}
