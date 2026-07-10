'use client';

import { FormEvent, useEffect, useState } from 'react';

interface ApiAction { label: string; method: 'GET' | 'POST'; endpoint: string; body?: Record<string, unknown> }

interface ApiResourcePageProps {
  title: string;
  description: string;
  endpoint: string;
  actions?: ApiAction[];
}

const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export function ApiResourcePage({ title, description, endpoint, actions = [] }: ApiResourcePageProps) {
  const [data, setData] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load(target = endpoint, init?: RequestInit) {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${apiBase}${target}`, init);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
      setData(payload);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [endpoint]);

  async function submitAction(event: FormEvent<HTMLFormElement>, action: ApiAction) {
    event.preventDefault();
    await load(action.endpoint, { method: action.method, headers: { 'content-type': 'application/json' }, body: action.method === 'POST' ? JSON.stringify(action.body ?? {}) : undefined });
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
      <header className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-300">Production control</p>
        <h1 className="text-3xl font-bold">{title}</h1>
        <p className="text-slate-400">{description}</p>
      </header>
      <section className="flex flex-wrap gap-3">
        <button className="rounded-lg bg-cyan-400 px-4 py-2 font-semibold text-slate-950" onClick={() => load()} type="button">Refresh</button>
        {actions.map((action) => <form key={action.label} onSubmit={(event) => submitAction(event, action)}><button className="rounded-lg border border-slate-700 px-4 py-2 text-slate-100" type="submit">{action.label}</button></form>)}
      </section>
      {loading ? <p className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-slate-300">Loading…</p> : null}
      {error ? <p className="rounded-xl border border-red-900 bg-red-950/40 p-4 text-red-200">{error}</p> : null}
      <pre className="overflow-auto rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-200">{JSON.stringify(data, null, 2)}</pre>
    </main>
  );
}
