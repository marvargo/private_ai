'use client';

import { FormEvent, useEffect, useState } from 'react';
import { authenticatedJson } from '../../../lib/authenticatedApi';

type ChatMessage = { role: 'user' | 'assistant'; content: string };
type Project = { id: string; name: string };
type Conversation = { id: string; title: string; projectId?: string; pinnedAt?: string; archivedAt?: string; folder?: string };

export default function ChatPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<string>('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    authenticatedJson<Project[]>('/projects')
      .then(setProjects)
      .catch(() => setProjects([]));
  }, []);

  useEffect(() => {
    const qs = new URLSearchParams();
    if (projectId) qs.set('projectId', projectId);
    if (search) qs.set('q', search);
    authenticatedJson<Conversation[]>(`/conversations?${qs.toString()}`).then(setConversations).catch(() => setConversations([]));
  }, [projectId, search]);

  async function newChat() {
    const conversation = await authenticatedJson<Conversation>('/conversations', { method: 'POST', json: { projectId, title: 'New conversation' } });
    setConversationId(conversation.id);
    setMessages([]);
    setConversations([conversation, ...conversations]);
  }

  async function openConversation(id: string) {
    const payload = await authenticatedJson<{ conversation: Conversation; messages: ChatMessage[] }>(`/conversations/${id}`);
    setConversationId(payload.conversation.id);
    setMessages(payload.messages.filter((message) => message.role === 'user' || message.role === 'assistant'));
  }

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!input.trim()) return;
    const next = [...messages, { role: 'user' as const, content: input }];
    setMessages(next);
    setInput('');
    setLoading(true);
    setError(null);
    try {
      const payload = await authenticatedJson<{ conversationId?: string; choices?: Array<{ message?: { content?: string } }> }>('/chat/completions', {
        method: 'POST',
        json: { conversationId, projectId, capability: 'chat', category: 'general', taskType: 'general_chat', messages: [{ role: 'user', content: input }] },
      });
      if (payload.conversationId) setConversationId(payload.conversationId);
      setMessages([...next, { role: 'assistant', content: payload.choices?.[0]?.message?.content || '(No response content)' }]);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : String(sendError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto grid max-w-7xl gap-6 p-4 md:grid-cols-[280px_1fr] md:p-8">
      <aside className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
        <button className="w-full rounded-lg bg-cyan-400 px-4 py-2 font-semibold text-slate-950" type="button" onClick={newChat}>New chat</button>
        <label className="block text-sm text-slate-300">Workspace<select aria-label="Workspace" className="mt-2 w-full rounded-lg bg-slate-950 p-2" value={projectId} onChange={(event) => setProjectId(event.target.value)}><option value="">Personal workspace</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
        <input className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search conversations" />
        <div className="space-y-2 text-sm">{conversations.map((conversation) => <button key={conversation.id} type="button" onClick={() => openConversation(conversation.id)} className="block w-full rounded-lg border border-slate-800 px-3 py-2 text-left text-slate-300 hover:border-cyan-700">{conversation.pinnedAt ? '★ ' : ''}{conversation.title}</button>)}</div>
      </aside>
      <section className="space-y-6">
        <header className="space-y-2"><p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-300">Private AI</p><h1 className="text-3xl font-bold">Chat</h1><p className="text-slate-400">{projectId ? 'Working in the selected project.' : 'Working in your personal workspace.'} The platform automatically chooses the right private capability without exposing infrastructure or model details.</p></header>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="min-h-80 space-y-3 rounded-xl bg-slate-950/70 p-4">{messages.length === 0 ? <p className="text-slate-500">Start a private conversation.</p> : messages.map((message, index) => <div key={index} className={message.role === 'user' ? 'text-cyan-100' : 'text-emerald-100'}><strong>{message.role === 'user' ? 'You' : 'Assistant'}:</strong> {message.content}</div>)}{loading ? <p className="text-slate-400">Preparing response…</p> : null}</div>
          {error ? <p className="mt-3 rounded-lg border border-red-900 bg-red-950/40 p-3 text-red-200">{error}</p> : null}
          <form onSubmit={send} className="mt-4 flex gap-2"><input className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask privately…" /><button className="rounded-lg bg-cyan-400 px-4 py-2 font-semibold text-slate-950" disabled={loading} type="submit">Send</button></form>
        </div>
      </section>
    </main>
  );
}
