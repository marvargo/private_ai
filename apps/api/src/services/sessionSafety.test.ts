import { describe, expect, it } from 'vitest';
import { createSession, updateSessionStatus } from './orchestrator.js';
import { checkAutoStop, emergencyStopAll } from './sessionSafety.js';

describe('session safety', () => {
  it('auto-stops expired running sessions', async () => {
    const session = await createSession({ sessionName: 'auto-stop-test', gpuType: 'NVIDIA H100 80GB HBM3', gpuCount: 8, maxHours: 1, podId: 'pod-auto' });
    await updateSessionStatus(session.id, 'running');
    const result = await checkAutoStop(new Date(Date.now() + 2 * 60 * 60 * 1000), async () => ({ ok: true }));
    expect(result.results.some((item) => item.sessionId === session.id)).toBe(true);
  });

  it('emergency-stops active sessions', async () => {
    const session = await createSession({ sessionName: 'emergency-test', gpuType: 'NVIDIA H100 80GB HBM3', gpuCount: 8, maxHours: 1, podId: 'pod-emergency' });
    await updateSessionStatus(session.id, 'running');
    const result = await emergencyStopAll(async () => ({ ok: true }));
    expect(result.results.some((item) => item.sessionId === session.id)).toBe(true);
  });
});
