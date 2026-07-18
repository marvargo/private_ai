import { ModelRole } from '@wyndme/shared';
import { chatWithPrivateModel } from './modelClient.js';
import { addConversationMessage, createConversation, getConversation, listConversationMessages } from './conversations.js';
import { writeAudit } from './orchestrator.js';

export interface ChatCompletionInput {
  conversationId?: string;
  projectId?: string;
  userId?: string;
  capability?: string;
  category?: string;
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
  const conversation = input.conversationId ? await getConversation(input.conversationId, input.userId) : await createConversation({ title: 'New conversation', modelRole: input.modelRole ?? 'auto', createdBy: input.userId, projectId: input.projectId });
  if (!conversation) throw new Error(`Conversation ${input.conversationId} not found`);

  for (const message of input.messages) {
    if (message.role === 'user' || message.role === 'system') {
      await addConversationMessage({ conversationId: conversation.id, role: message.role as 'user' | 'system', content: message.content, ownerId: input.userId });
    }
  }

  const history = await listConversationMessages(conversation.id, input.userId);
  const completion = await chatWithPrivateModel(history.map((message) => ({ role: message.role, content: message.content })), input);
  const content = assistantText(completion);
  await addConversationMessage({ conversationId: conversation.id, role: 'assistant', content, metadata: { capability: input.capability ?? 'chat', category: input.category ?? 'general' }, ownerId: input.userId });
  await writeAudit({ actorType: 'system', action: 'capability.executed', targetType: 'conversation', targetId: conversation.id, status: 'ok', metadata: { capability: input.capability ?? 'chat', category: input.category ?? 'general', durationMs: completion.latencyMs, success: true } });
  const { modelRouting: _hiddenRouting, ...whiteLabelCompletion } = completion;
  return { conversationId: conversation.id, privateModelOnly: true, capability: input.capability ?? 'chat', ...whiteLabelCompletion }; 
}

export async function privateChatCompletionStream(input: ChatCompletionInput) {
  const completion = await privateChatCompletion(input);
  return { event: 'message', data: completion, privateModelOnly: true };
}
