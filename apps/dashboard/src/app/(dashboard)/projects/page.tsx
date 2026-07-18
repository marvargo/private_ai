'use client';

import { useEffect, useState } from 'react';
import { authenticatedJson } from '../../../lib/authenticatedApi';

type ProjectCard = { id: string; name: string; projectType: string; description: string; status: string; owner: string; currentUserRole: string; memberCount: number; lastActivity: string; favorite: boolean; health: string; counts: Record<string, number>; pendingApprovals: number };
type Groups = { recent: ProjectCard[]; ownedByMe: ProjectCard[]; sharedWithMe: ProjectCard[]; favorites: ProjectCard[]; archived: ProjectCard[] };

function ProjectCardView({ card }: { card: ProjectCard }) {
  return <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4"><div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-semibold text-white">{card.name}</h2><p className="text-sm text-slate-400">{card.description}</p></div><span className="rounded-full bg-emerald-950 px-2 py-1 text-xs text-emerald-200">{card.health}</span></div><div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-400"><span>{card.projectType}</span><span>{card.status}</span><span>{card.currentUserRole}</span><span>{card.memberCount} members</span><span>{card.pendingApprovals} approvals</span><span>{new Date(card.lastActivity).toLocaleDateString()}</span></div><div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-300">{Object.entries(card.counts).map(([key, value]) => <span key={key} className="rounded border border-slate-800 px-2 py-1">{key}: {value}</span>)}</div><div className="mt-4 flex gap-2"><a href={`/projects/${card.id}`} className="rounded bg-cyan-400 px-3 py-2 text-sm font-semibold text-slate-950">Open</a><button className="rounded border border-slate-700 px-3 py-2 text-sm text-slate-200" type="button">Share</button><button className="rounded border border-slate-700 px-3 py-2 text-sm text-slate-200" type="button">Settings</button></div></article>;
}

export default function ProjectsPage() {
  const [groups, setGroups] = useState<Groups>({ recent: [], ownedByMe: [], sharedWithMe: [], favorites: [], archived: [] });
  useEffect(() => { authenticatedJson<Groups>('/projects/cards').then(setGroups).catch(() => setGroups({ recent: [], ownedByMe: [], sharedWithMe: [], favorites: [], archived: [] })); }, []);
  const sections: Array<[string, ProjectCard[]]> = [['Recent', groups.recent], ['Owned by Me', groups.ownedByMe], ['Shared With Me', groups.sharedWithMe], ['Favorites', groups.favorites], ['Archived', groups.archived]];
  return <main className="mx-auto max-w-7xl space-y-8 p-4 md:p-8"><header><p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-300">Private AI</p><h1 className="text-3xl font-bold">Projects</h1><p className="text-slate-400">Open collaborative workspaces without exposing infrastructure or model details.</p></header>{sections.map(([title, cards]) => <section key={title} className="space-y-3"><h2 className="text-xl font-semibold">{title}</h2>{cards.length === 0 ? <p className="rounded border border-slate-800 p-4 text-slate-500">No projects in this group.</p> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{cards.map((card) => <ProjectCardView key={card.id} card={card} />)}</div>}</section>)}</main>;
}
