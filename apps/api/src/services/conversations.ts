import { randomUUID } from 'node:crypto';
import { Conversation, ConversationMessage, ModelRole } from '@wyndme/shared';
import { getSupabaseAdminClient, isSupabaseConfigured } from '../repositories/supabaseClient.js';
import { writeAudit } from './orchestrator.js';

const conversations = new Map<string, Conversation>();
const messages = new Map<string, ConversationMessage[]>();

function id(prefix: string) {
  return `${prefix}_${randomUUID()}`;
}

function stripPrefix(value: string) {
  return value.replace(/^(conversation|message)_/, '');
}

function withPrefix(prefix: string, value: string) {
  return value.startsWith(`${prefix}_`) ? value : `${prefix}_${value}`;
}

function conversationFromRow(row: any): Conversation {
  return { id: withPrefix('conversation', row.id), title: row.title, modelRole: row.model_role, createdBy: row.created_by ?? undefined, createdAt: row.created_at, updatedAt: row.updated_at };
}

function messageFromRow(row: any): ConversationMessage {
  return { id: withPrefix('message', row.id), conversationId: withPrefix('conversation', row.conversation_id), role: row.role, content: row.content, modelName: row.model_name ?? undefined, metadata: row.metadata ?? {}, createdAt: row.created_at };
}

export async function listConversations() {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await getSupabaseAdminClient().from('conversations').select('*').order('updated_at', { ascending: false }).limit(100);
      if (error) throw error;
      return (data ?? []).map(conversationFromRow);
    } catch {
      // local fallback below
    }
  }
  return Array.from(conversations.values()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function createConversation(input: { title?: string; modelRole?: ModelRole; createdBy?: string }) {
  const now = new Date().toISOString();
  const local: Conversation = { id: id('conversation'), title: input.title || 'New conversation', modelRole: input.modelRole ?? 'auto', createdBy: input.createdBy, createdAt: now, updatedAt: now };
  conversations.set(local.id, local);
  messages.set(local.id, []);
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await getSupabaseAdminClient().from('conversations').insert({ id: stripPrefix(local.id), title: local.title, model_role: local.modelRole, created_by: local.createdBy }).select('*').single();
      if (error) throw error;
      return conversationFromRow(data);
    } catch {
      // local fallback
    }
  }
  await writeAudit({ actorType: 'admin', action: 'conversation.created', targetType: 'conversation', targetId: local.id, status: 'ok' });
  return local;
}

export async function getConversation(conversationId: string) {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await getSupabaseAdminClient().from('conversations').select('*').eq('id', stripPrefix(conversationId)).single();
      if (error) throw error;
      return conversationFromRow(data);
    } catch {
      // local fallback
    }
  }
  return conversations.get(conversationId);
}

export async function listConversationMessages(conversationId: string) {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await getSupabaseAdminClient().from('conversation_messages').select('*').eq('conversation_id', stripPrefix(conversationId)).order('created_at', { ascending: true }).limit(500);
      if (error) throw error;
      return (data ?? []).map(messageFromRow);
    } catch {
      // local fallback
    }
  }
  return messages.get(conversationId) ?? [];
}

export async function addConversationMessage(input: { conversationId: string; role: ConversationMessage['role']; content: string; modelName?: string; metadata?: Record<string, unknown> }) {
  const message: ConversationMessage = { id: id('message'), conversationId: input.conversationId, role: input.role, content: input.content, modelName: input.modelName, metadata: input.metadata ?? {}, createdAt: new Date().toISOString() };
  const existing = messages.get(input.conversationId) ?? [];
  existing.push(message);
  messages.set(input.conversationId, existing);
  const conversation = conversations.get(input.conversationId);
  if (conversation) conversations.set(input.conversationId, { ...conversation, updatedAt: message.createdAt });

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await getSupabaseAdminClient().from('conversation_messages').insert({ id: stripPrefix(message.id), conversation_id: stripPrefix(input.conversationId), role: input.role, content: input.content, model_name: input.modelName, metadata: input.metadata ?? {} }).select('*').single();
      if (error) throw error;
      await getSupabaseAdminClient().from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', stripPrefix(input.conversationId));
      return messageFromRow(data);
    } catch {
      // local fallback
    }
  }
  return message;
}
