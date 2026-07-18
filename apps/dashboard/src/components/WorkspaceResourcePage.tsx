'use client';

import { FormEvent, useEffect, useState } from 'react';
import { authenticatedJson } from '../lib/authenticatedApi';

type Project = { id: string; name: string };
type WorkspaceRecord = { id: string; name: string; status: string; capability: string; category?: string; metadata?: Record<string, unknown>; createdAt: string; updatedAt: string };

interface WorkspaceResourcePageProps {
  title: string;
  description: string;
  endpoint: string;
  createLabel: string;
  defaultCategory?: string;
  featureGroups: string[];
}

export function WorkspaceResourcePage({ title, description, endpoint, createLabel, defaultCategory, featureGroups }: WorkspaceResourcePageProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState('');
  const [records, setRecords] = useState<WorkspaceRecord[]>([]);
  const [name, setName] = useState('');
  const [category, setCategory] = useState(defaultCategory ?? 'general');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    authenticatedJson<Project[]>('/projects')
      .then((loaded) => {
        setProjects(loaded);
        if (loaded[0]) setProjectId(loaded[0].id);
      })
      .catch(() => authenticatedJson<Project>('/projects/default', { method: 'POST', json: {} }).then((project) => { setProjects([project]); setProjectId(project.id); }));
  }, []);

  useEffect(() => {
    const qs = new URLSearchParams();
    if (projectId) qs.set('projectId', projectId);
    authenticatedJson<WorkspaceRecord[]>(`${endpoint}?${qs.toString()}`).then(setRecords).catch(() => setRecords([]));
  }, [endpoint, projectId]);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) return;
    setError(null);
    try {
      const record = await authenticatedJson<WorkspaceRecord>(endpoint, { method: 'POST', json: { projectId, name, category, metadata: { createdFrom: 'workspace' } } });
      setRecords([record, ...records]);
      setName('');
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : String(createError));
    }
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
      <header className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-300">Private AI</p>
        <h1 className="text-3xl font-bold">{title}</h1>
        <p className="max-w-4xl text-slate-400">{description}</p>
      </header>
      <section className="grid gap-4 md:grid-cols-[320px_1fr]">
        <form onSubmit={create} className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <label className="block text-sm text-slate-300">Project<select className="mt-2 w-full rounded-lg bg-slate-950 p-2" value={projectId} onChange={(event) => setProjectId(event.target.value)}>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
          <label className="block text-sm text-slate-300">Name<input className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" value={name} onChange={(event) => setName(event.target.value)} placeholder={createLabel} /></label>
          <label className="block text-sm text-slate-300">Category<input className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" value={category} onChange={(event) => setCategory(event.target.value)} /></label>
          <button className="w-full rounded-lg bg-cyan-400 px-4 py-2 font-semibold text-slate-950" type="submit">Create</button>
          {error ? <p className="rounded border border-red-900 bg-red-950/40 p-2 text-sm text-red-200">{error}</p> : null}
        </form>
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">{featureGroups.map((feature) => <div key={feature} className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 text-slate-300">{feature}</div>)}</div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
            <h2 className="font-semibold text-white">Project history</h2>
            <div className="mt-3 space-y-2">{records.length === 0 ? <p className="text-slate-500">No project records yet.</p> : records.map((record) => <div key={record.id} className="rounded-lg border border-slate-800 p-3 text-slate-300"><div className="font-semibold text-white">{record.name}</div><div className="text-xs uppercase tracking-wide text-slate-500">{record.status} · {record.category ?? record.capability}</div></div>)}</div>
          </div>
        </div>
      </section>
    </main>
  );
}
