'use client';

import { authenticatedJson } from '../lib/authenticatedApi';

async function post(path: string, body?: unknown) {
  return authenticatedJson<Record<string, unknown>>(path, { method: 'POST', json: body });
}

export function CommandActions() {
  async function createSession() {
    const payload = await post('/sessions', {
      sessionName: 'Manual Qwen coding session',
      gpuType: 'NVIDIA H100 80GB HBM3',
      gpuCount: 4,
      modelRole: 'coding',
      estimatedHourlyCost: 10.76,
      maxHours: 4,
    });
    alert(`Session tracked: ${payload.id}. RunPod pod start remains backend-gated until credentials and approval are connected.`);
  }

  async function runAutoStop() {
    const payload = await post('/sessions/auto-stop/check');
    alert(`Auto-stop check complete. Stopped ${payload.stoppedCount ?? 0} session(s).`);
  }

  async function emergencyStop() {
    const confirmed = confirm('Emergency stop all pending/starting/running sessions?');
    if (!confirmed) return;
    const payload = await post('/sessions/emergency-stop');
    alert(`Emergency stop complete. Stopped ${payload.stoppedCount ?? 0} session(s).`);
  }

  return <div className="mt-4 grid gap-3 sm:grid-cols-3">
    <button className="btn bg-emerald-500 text-slate-950" onClick={() => void createSession().catch((error) => alert(error.message))}>Track Qwen session</button>
    <button className="btn bg-amber-400 text-slate-950" onClick={() => void runAutoStop().catch((error) => alert(error.message))}>Run auto-stop check</button>
    <button className="btn bg-red-500 text-white" onClick={() => void emergencyStop().catch((error) => alert(error.message))}>Emergency stop</button>
  </div>;
}
