import { CommandActions } from '../components/CommandActions';
import { StatusCard } from '../components/StatusCard';
import { ModelRoleSelector } from '../components/ModelRoleSelector';
import { getDashboardState, getGpuTargets } from '../lib/api';

const sections = ['Chat', 'Task Queue', 'RunPod Manager', 'Model Runtime', 'GitHub', 'Supabase', 'Knowledge Base', 'Logs & Audit', 'Settings'];

export default async function Home() {
  const [state, gpuTargets] = await Promise.all([getDashboardState(), getGpuTargets()]);
  const running = state.sessions.filter((session) => session.status === 'running').length;
  const pricedTargets = gpuTargets.filter((gpu) => gpu.currentlyPricedForEightGpu).length;
  const llamaModels = state.modelRegistry.filter((model) => model.modelFamily === 'llama');
  const qwenModels = state.modelRegistry.filter((model) => model.modelFamily === 'qwen');

  return <main className="min-h-screen p-4 md:p-8">
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[.35em] text-cyan-300">WyndMe Private AI</p>
          <h1 className="text-3xl font-bold md:text-5xl">Private Multi-Model AI Factory</h1>
          <p className="mt-2 max-w-3xl text-slate-300">Operational dashboard for RunPod sessions, cost guardrails, model runtime health, GitHub/Supabase workflows, task automation, logs, approvals, and emergency shutdown.</p>
        </div>
        <div className="card"><p className="text-sm text-slate-400">Privacy mode</p><p className="text-xl font-bold text-emerald-300">Private by default</p></div>
      </header>

      <section className="grid gap-4 md:grid-cols-4">
        <StatusCard title="RunPod sessions" value={`${running} running`} detail={`${state.sessions.length} tracked`} />
        <StatusCard title="Models" value={`Llama ${llamaModels.length} / Qwen ${qwenModels.length}`} detail="role-routed private models" />
        <StatusCard title="Auto-stop" value="4 hours" detail="hard max session guardrail" />
        <StatusCard title="8x target GPUs" value={`${pricedTargets}/${gpuTargets.length || 3} priced`} detail="H100/H200/B200 catalog check" />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="card lg:col-span-2"><h2 className="text-2xl font-bold">Command Center</h2><div className="mt-4 grid gap-4 md:grid-cols-2"><ModelRoleSelector label="Private chat model" /><ModelRoleSelector label="New task model role" /></div><CommandActions /><p className="mt-4 text-sm text-slate-300">Start is gated by hardware feasibility, budget policy, approval rules, and credential checks. RunPod/GitHub/Supabase secrets stay backend-only. Auto routes reasoning/research/review to Llama and coding/database/testing/devops to Qwen Coder.</p></div>
        <div className="card"><h2 className="text-xl font-bold">Runtime</h2><dl className="mt-3 space-y-2 text-sm text-slate-300"><div><dt className="text-slate-500">Status</dt><dd>{state.runtime.status}</dd></div><div><dt className="text-slate-500">Context</dt><dd>{state.runtime.contextLength.toLocaleString()} tokens</dd></div><div><dt className="text-slate-500">Quantization</dt><dd>{state.runtime.quantization}</dd></div></dl></div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="card"><h2 className="text-xl font-bold">Model registry</h2><div className="mt-3 space-y-2">{state.modelRegistry.length ? state.modelRegistry.map((model) => <div key={model.id} className="rounded-xl bg-slate-950/60 p-3 text-sm"><div className="font-semibold">{model.modelFamily.toUpperCase()} · {model.modelRole}</div><div className="text-slate-400">{model.modelName} · {model.gpuProfile} · {model.enabled ? 'enabled' : 'disabled'}</div></div>) : <p className="text-sm text-slate-400">API not connected yet.</p>}</div></div>
        <div className="card"><h2 className="text-xl font-bold">RunPod 8x GPU targets</h2><div className="mt-3 space-y-2">{gpuTargets.length ? gpuTargets.map((gpu) => <div key={gpu.id} className="rounded-xl bg-slate-950/60 p-3 text-sm"><div className="font-semibold">{gpu.displayName || gpu.id}</div><div className="text-slate-400">{gpu.totalEightGpuVramGb ?? 0}GB VRAM / 8 GPUs · {gpu.currentlyPricedForEightGpu ? 'priced' : 'not currently priced'}</div></div>) : <p className="text-sm text-slate-400">API not connected yet. Add RUNPOD_API_KEY to API environment.</p>}</div></div>
        <div className="card"><h2 className="text-xl font-bold">Task queue</h2><div className="mt-3 space-y-2">{state.tasks.length ? state.tasks.map((task) => <p key={task.id} className="text-sm text-slate-300">{task.title} — {task.status}</p>) : <p className="text-sm text-slate-400">No tasks queued.</p>}</div></div>
        <div className="card"><h2 className="text-xl font-bold">Recent audit</h2><div className="mt-3 space-y-2">{state.auditLogs.length ? state.auditLogs.slice(0, 5).map((log) => <p key={log.id} className="text-sm text-slate-300">{log.action} — {log.status}</p>) : <p className="text-sm text-slate-400">No audit events yet.</p>}</div></div>
        <div className="card"><h2 className="text-xl font-bold">Cost events</h2><div className="mt-3 space-y-2">{state.costEvents.length ? state.costEvents.slice(0, 5).map((event) => <p key={event.id} className="text-sm text-slate-300">{event.eventType} — ${event.estimatedHourlyCost ?? 0}/hr</p>) : <p className="text-sm text-slate-400">No cost events yet.</p>}</div></div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{sections.map((section) => <div key={section} className="card"><h3 className="font-bold">{section}</h3><p className="mt-2 text-sm text-slate-400">API-backed module area ready for the next production iteration.</p></div>)}</section>
    </div>
  </main>;
}
