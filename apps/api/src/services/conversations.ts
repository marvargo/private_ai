import { randomUUID } from 'node:crypto';
import { Conversation, ConversationMessage, ModelRole } from '@wyndme/shared';
import { getSupabaseAdminClient, isSupabaseConfigured } from '../repositories/supabaseClient.js';
import { AppError } from '../errors/AppError.js';
import { getDevelopmentInMemoryStores } from '../repositories/index.js';
import { writeAudit } from './orchestrator.js';
import { decryptSecret, encryptSecret } from './crypto.js';
import { env } from '../utils/env.js';

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
  return { id: withPrefix('conversation', row.id), title: row.title, modelRole: row.model_role, createdBy: row.created_by ?? undefined, projectId: row.project_id ? `project_${row.project_id}` : undefined, archivedAt: row.archived_at ?? undefined, pinnedAt: row.pinned_at ?? undefined, folder: row.folder ?? undefined, settings: row.settings ?? {}, createdAt: row.created_at, updatedAt: row.updated_at } as Conversation;
}

function decryptContent(row: any) {
  if (row.encrypted_content && env.ENCRYPTION_KEY) {
    try { return decryptSecret(row.encrypted_content, env.ENCRYPTION_KEY); } catch { return ''; }
  }
  return row.content ?? '';
}

function messageFromRow(row: any): ConversationMessage {
  return { id: withPrefix('message', row.id), conversationId: withPrefix('conversation', row.conversation_id), role: row.role, content: decryptContent(row), modelName: undefined, metadata: row.metadata ?? {}, createdAt: row.created_at };
}

export async function listConversations(ownerId?: string, projectId?: string, queryText?: string) {
  if (isSupabaseConfigured()) {
    try {
      let query = getSupabaseAdminClient().from('conversations').select('*').order('updated_at', { ascending: false });
      if (ownerId) query = query.eq('created_by', ownerId);
      if (projectId) query = query.eq('project_id', stripPrefix(projectId));
      if (queryText) query = query.ilike('title', `%${queryText}%`);
      const { data, error } = await query.limit(100);
      if (error) throw error;
      return (data ?? []).map(conversationFromRow);
    } catch (error) { throw new AppError({ message: 'Failed to list conversations', code: 'CONVERSATIONS_LIST_FAILED', statusCode: 503, safeDetails: { ownerId: Boolean(ownerId), projectId: Boolean(projectId) }, cause: error }); }
  }
  const { conversations } = getDevelopmentInMemoryStores();
  return Array.from(conversations.values()).filter((conversation) => (!ownerId || conversation.createdBy === ownerId) && (!projectId || (conversation as any).projectId === projectId) && (!queryText || conversation.title.toLowerCase().includes(queryText.toLowerCase()))).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function createConversation(input: { title?: string; modelRole?: ModelRole; createdBy?: string; projectId?: string; folder?: string; settings?: Record<string, unknown>; standalone?: boolean }) {
  const projectId = input.projectId;
  const now = new Date().toISOString();
  const local: Conversation = { id: id('conversation'), title: input.title || 'New conversation', modelRole: input.modelRole ?? 'auto', createdBy: input.createdBy, projectId, folder: input.folder, settings: input.settings ?? {}, createdAt: now, updatedAt: now } as Conversation;
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await getSupabaseAdminClient().from('conversations').insert({ id: stripPrefix(local.id), title: local.title, model_role: local.modelRole, created_by: local.createdBy, project_id: projectId ? stripPrefix(projectId) : null, folder: input.folder, settings: input.settings ?? {} }).select('*').single();
      if (error) throw error;
      return conversationFromRow(data);
    } catch (error) { throw new AppError({ message: 'Failed to create conversation', code: 'CONVERSATION_CREATE_FAILED', statusCode: 503, safeDetails: { projectId: Boolean(projectId) }, cause: error }); }
  }
  const { conversations, messages } = getDevelopmentInMemoryStores();
  conversations.set(local.id, local);
  messages.set(local.id, []);
  await writeAudit({ actorType: 'admin', action: 'conversation.created', targetType: 'conversation', targetId: local.id, status: 'ok' });
  return local;
}

export async function getConversation(conversationId: string, ownerId?: string) {
  if (isSupabaseConfigured()) {
    try {
      let query = getSupabaseAdminClient().from('conversations').select('*').eq('id', stripPrefix(conversationId));
      if (ownerId) query = query.eq('created_by', ownerId);
      const { data, error } = await query.single();
      if (error) throw error;
      return conversationFromRow(data);
    } catch (error) { throw new AppError({ message: 'Failed to read conversation', code: 'CONVERSATION_READ_FAILED', statusCode: 503, safeDetails: { conversationId }, cause: error }); }
  }
  const { conversations } = getDevelopmentInMemoryStores();
  const conversation = conversations.get(conversationId);
  return !ownerId || conversation?.createdBy === ownerId ? conversation : undefined;
}

export async function listConversationMessages(conversationId: string, ownerId?: string) {
  const conversation = await getConversation(conversationId, ownerId);
  if (!conversation) return [];
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await getSupabaseAdminClient().from('conversation_messages').select('*').eq('conversation_id', stripPrefix(conversationId)).order('created_at', { ascending: true }).limit(500);
      if (error) throw error;
      return (data ?? []).map(messageFromRow);
    } catch (error) { throw new AppError({ message: 'Failed to list conversation messages', code: 'CONVERSATION_MESSAGES_LIST_FAILED', statusCode: 503, safeDetails: { conversationId }, cause: error }); }
  }
  const { messages } = getDevelopmentInMemoryStores();
  return messages.get(conversationId) ?? [];
}

export async function addConversationMessage(input: { conversationId: string; role: ConversationMessage['role']; content: string; modelName?: string; metadata?: Record<string, unknown>; ownerId?: string }) {
  const allowed = await getConversation(input.conversationId, input.ownerId);
  if (!allowed) throw new Error('Conversation not found');
  const message: ConversationMessage = { id: id('message'), conversationId: input.conversationId, role: input.role, content: input.content, modelName: undefined, metadata: input.metadata ?? {}, createdAt: new Date().toISOString() };
  const stores = isSupabaseConfigured() ? undefined : getDevelopmentInMemoryStores();
  const existing = stores?.messages.get(input.conversationId) ?? [];
  existing.push(message);
  if (stores) {
    stores.messages.set(input.conversationId, existing);
    const conversation = stores.conversations.get(input.conversationId);
    if (conversation) stores.conversations.set(input.conversationId, { ...conversation, updatedAt: message.createdAt });
  }

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await getSupabaseAdminClient().from('conversation_messages').insert({ id: stripPrefix(message.id), conversation_id: stripPrefix(input.conversationId), role: input.role, content: env.ENCRYPTION_KEY ? null : input.content, encrypted_content: env.ENCRYPTION_KEY ? encryptSecret(input.content, env.ENCRYPTION_KEY) : null, model_name: null, metadata: input.metadata ?? {} }).select('*').single();
      if (error) throw error;
      await getSupabaseAdminClient().from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', stripPrefix(input.conversationId));
      return messageFromRow(data);
    } catch (error) { throw new AppError({ message: 'Failed to add conversation message', code: 'CONVERSATION_MESSAGE_CREATE_FAILED', statusCode: 503, safeDetails: { conversationId: input.conversationId, role: input.role }, cause: error }); }
  }
  if (!stores) getDevelopmentInMemoryStores();
  return message;
}


export async function updateConversation(input: { conversationId: string; ownerId?: string; title?: string; archived?: boolean; pinned?: boolean; folder?: string; settings?: Record<string, unknown> }) {
  const conversation = await getConversation(input.conversationId, input.ownerId);
  if (!conversation) throw new Error('Conversation not found');
  const now = new Date().toISOString();
  const updated = { ...conversation, title: input.title ?? conversation.title, archivedAt: input.archived === undefined ? (conversation as any).archivedAt : input.archived ? now : undefined, pinnedAt: input.pinned === undefined ? (conversation as any).pinnedAt : input.pinned ? now : undefined, folder: input.folder ?? (conversation as any).folder, settings: input.settings ?? (conversation as any).settings ?? {}, updatedAt: now } as Conversation;
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await getSupabaseAdminClient().from('conversations').update({ title: updated.title, archived_at: updated.archivedAt ?? null, pinned_at: updated.pinnedAt ?? null, folder: updated.folder ?? null, settings: updated.settings ?? {}, updated_at: now }).eq('id', stripPrefix(input.conversationId)).eq('created_by', input.ownerId).select('*').single();
      if (error) throw error;
      return conversationFromRow(data);
    } catch (error) { throw new AppError({ message: 'Failed to update conversation', code: 'CONVERSATION_UPDATE_FAILED', statusCode: 503, safeDetails: { conversationId: input.conversationId }, cause: error }); }
  }
  const { conversations } = getDevelopmentInMemoryStores();
  conversations.set(input.conversationId, updated);
  return updated;
}

export async function deleteConversation(conversationId: string, ownerId?: string) {
  const conversation = await getConversation(conversationId, ownerId);
  if (!conversation) throw new Error('Conversation not found');
  if (isSupabaseConfigured()) {
    const { error } = await getSupabaseAdminClient().from('conversations').delete().eq('id', stripPrefix(conversationId)).eq('created_by', ownerId);
    if (error) throw new AppError({ message: 'Failed to delete conversation', code: 'CONVERSATION_DELETE_FAILED', statusCode: 503, safeDetails: { conversationId }, cause: error });
  } else {
    const { conversations, messages } = getDevelopmentInMemoryStores();
    conversations.delete(conversationId);
    messages.delete(conversationId);
  }
  return { ok: true, conversationId };
}
