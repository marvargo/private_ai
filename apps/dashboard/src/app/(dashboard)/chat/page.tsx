'use client';

import { FormEvent, useState } from 'react';
import { createSupabaseBrowserClient } from '../../../lib/supabaseClient';

type ChatMessage = { role: 'user' | 'assistant'; content: string };

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [modelRole, setModelRole] = useState('auto');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!input.trim()) return;
    const next = [...messages, { role: 'user' as const, content: input }];
    setMessages(next);
    setInput('');
    setLoading(true);
    setError(null);
    try {
      const { data } = await createSupabaseBrowserClient().auth.getSession();
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/chat/completions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(data.session?.access_token ? { authorization: `Bearer ${data.session.access_token}` } : {}) },
        body: JSON.stringify({ modelRole, taskType: modelRole === 'coding' ? 'app_development' : 'business_strategy', messages: [{ role: 'user', content: input }] }),
      });
      if (!response.ok) throw new Error(`Chat HTTP ${response.status}`);
      const payload = await response.json();
      setMessages([...next, { role: 'assistant', content: payload.choices?.[0]?.message?.content || '(No response content)' }]);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : String(sendError));
    } finally {
      setLoading(false);
    }
  }

  function exportConversation() {
    const blob = new Blob([JSON.stringify(messages, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'private-ai-conversation.json';
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-4 md:p-8">
      <header className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-300">Private model only</p>
        <h1 className="text-3xl font-bold">Private Chat</h1>
        <p className="text-slate-400">Conversations route only to private OpenAI-compatible Llama/Qwen endpoints unless external providers are explicitly enabled server-side.</p>
      </header>
      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <select className="rounded-lg bg-slate-950 p-2" value={modelRole} onChange={(event) => setModelRole(event.target.value)}>
            <option value="auto">Auto</option>
            <option value="business_reasoning">Llama Thinking</option>
            <option value="coding">Qwen Coding</option>
          </select>
          <button className="rounded-lg border border-slate-700 px-3 py-2" type="button" onClick={exportConversation}>Export conversation</button>
        </div>
        <div className="min-h-80 space-y-3 rounded-xl bg-slate-950/70 p-4">
          {messages.length === 0 ? <p className="text-slate-500">Start a private conversation.</p> : messages.map((message, index) => <div key={index} className={message.role === 'user' ? 'text-cyan-100' : 'text-emerald-100'}><strong>{message.role}:</strong> {message.content}</div>)}
          {loading ? <p className="text-slate-400">Streaming response…</p> : null}
        </div>
        {error ? <p className="mt-3 rounded-lg border border-red-900 bg-red-950/40 p-3 text-red-200">{error}</p> : null}
        <form onSubmit={send} className="mt-4 flex gap-2">
          <input className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask privately…" />
          <button className="rounded-lg bg-cyan-400 px-4 py-2 font-semibold text-slate-950" disabled={loading} type="submit">Send</button>
        </form>
      </section>
    </main>
  );
}
