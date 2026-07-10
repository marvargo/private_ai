import { AiSession } from '@wyndme/shared';
import { stopRunPodPod } from '../integrations/runpod.js';
import { listSessions, updateSessionStatus, writeAudit, writeCostEvent } from './orchestrator.js';

export interface Stopper {
  (podId: string): Promise<unknown>;
}

export async function stopSession(session: AiSession, reason: 'manual' | 'auto_stop' | 'emergency_stop', stopper: Stopper = stopRunPodPod) {
  if (!session.podId) {
    await updateSessionStatus(session.id, 'stopped');
    await writeAudit({ actorType: 'system', action: `session.${reason}.no_pod`, targetType: 'ai_session', targetId: session.id, status: 'ok' });
    return { sessionId: session.id, stopped: true, providerStopped: false, reason };
  }
  await stopper(session.podId);
  await updateSessionStatus(session.id, 'stopped');
  await writeAudit({ actorType: 'system', action: `session.${reason}`, targetType: 'ai_session', targetId: session.id, status: 'ok', metadata: { podId: session.podId } });
  await writeCostEvent({ sessionId: session.id, provider: session.provider, resourceType: 'gpu_pod', gpuType: session.gpuType, gpuCount: session.gpuCount, estimatedHourlyCost: session.estimatedHourlyCost, eventType: reason });
  return { sessionId: session.id, stopped: true, providerStopped: true, reason };
}

export async function checkAutoStop(now = new Date(), stopper: Stopper = stopRunPodPod) {
  const sessions = await listSessions();
  const due = sessions.filter((session) => session.status === 'running' && session.autoStopAt && new Date(session.autoStopAt) <= now);
  const results = [];
  for (const session of due) results.push(await stopSession(session, 'auto_stop', stopper));
  return { checkedAt: now.toISOString(), stoppedCount: results.length, results };
}

export async function emergencyStopAll(stopper: Stopper = stopRunPodPod) {
  const sessions = await listSessions();
  const active = sessions.filter((session) => ['pending', 'starting', 'running'].includes(session.status));
  const results = [];
  for (const session of active) results.push(await stopSession(session, 'emergency_stop', stopper));
  return { stoppedCount: results.length, results };
}

export async function manualStopSession(sessionId: string, stopper: Stopper = stopRunPodPod) {
  const sessions = await listSessions();
  const session = sessions.find((item) => item.id === sessionId);
  if (!session) throw new Error(`Session ${sessionId} not found`);
  return stopSession(session, 'manual', stopper);
}
