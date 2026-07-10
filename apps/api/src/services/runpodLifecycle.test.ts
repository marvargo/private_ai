import { describe, expect, it } from 'vitest';
import {
  createLlama405BPodTemplate,
  createQwenCoderPodTemplate,
  createRunPodPod,
  createSmallTestPodTemplate,
  deleteRunPodPod,
  emergencyStopAllActiveSessions,
  getRunPodPodLogs,
  getRunPodPodStatus,
  listRunPodPods,
  scheduleAutoStop,
  startRunPodPod,
  stopRunPodPod,
} from './runpodLifecycle.js';

describe('RunPod lifecycle orchestration', () => {
  const mockPod = { id: 'pod-1', name: 'test', runtimeStatus: 'running', endpointUrl: 'https://pod-1.proxy.runpod.net', gpuType: 'NVIDIA H100 80GB HBM3', gpuCount: 1 };

  it('builds production model templates without provider secrets', () => {
    const llama = createLlama405BPodTemplate();
    const qwen = createQwenCoderPodTemplate();
    const test = createSmallTestPodTemplate();

    expect(llama.gpuCount).toBe(8);
    expect(llama.env.MODEL_ID).toContain('405B');
    expect(qwen.gpuCount).toBe(4);
    expect(qwen.env.MODEL_ID).toContain('Qwen');
    expect(test.gpuCount).toBe(1);
    expect(JSON.stringify([llama, qwen, test])).not.toContain('RUNPOD_API_KEY');
  });

  it('lists, reads status, and reads logs with mocked provider calls', async () => {
    await expect(listRunPodPods({ listRunPodPods: async () => [mockPod] })).resolves.toEqual([mockPod]);
    await expect(getRunPodPodStatus('pod-1', { getRunPodPodStatus: async () => mockPod })).resolves.toEqual(mockPod);
    await expect(getRunPodPodLogs('pod-1', { getRunPodPodLogs: async () => ({ supported: true, podId: 'pod-1', logs: 'ready' }) })).resolves.toMatchObject({ supported: true, logs: 'ready' });
  });

  it('requires approval before creating Llama 405B pods', async () => {
    const result = await createRunPodPod(createLlama405BPodTemplate(), { approved: false }, { createRunPodPod: async () => mockPod });
    expect(result.ok).toBe(false);
    expect(result.reason).toContain('Approval required');
    expect(result.approval?.approvalType).toBe('runpod_start');
  });

  it('creates Qwen pods with budget check, session persistence, and auto-stop', async () => {
    const result = await createRunPodPod(createQwenCoderPodTemplate(), { approved: false, hours: 1, estimatedHourlyCost: 1 }, { createRunPodPod: async () => mockPod });
    expect(result.ok).toBe(true);
    if (!('session' in result) || !('pod' in result)) throw new Error('expected create success');
    const success = result as { pod: typeof mockPod; session: { id: string; podId?: string }; autoStopAt?: string };
    expect(success.pod.id).toBe('pod-1');
    expect(success.session.podId).toBe('pod-1');
    expect(success.autoStopAt).toBeTruthy();
    await expect(scheduleAutoStop(success.session.id, 1)).resolves.toMatchObject({ sessionId: success.session.id });
  });

  it('starts and stops pods with budget checks', async () => {
    await expect(startRunPodPod('pod-1', { estimatedHourlyCost: 1, hours: 1 }, { startRunPodPod: async () => mockPod })).resolves.toMatchObject({ ok: true, pod: mockPod });
    await expect(stopRunPodPod('pod-1', { stopRunPodPod: async () => ({ ...mockPod, runtimeStatus: 'stopped' }) })).resolves.toMatchObject({ ok: true });
  });

  it('requires approval before delete and deletes when approved', async () => {
    const blocked = await deleteRunPodPod('pod-1', false, { deleteRunPodPod: async () => ({ ok: true, podId: 'pod-1' }) });
    expect(blocked.ok).toBe(false);
    expect(blocked.approval?.approvalType).toBe('runpod_delete');

    await expect(deleteRunPodPod('pod-1', true, { deleteRunPodPod: async () => ({ ok: true, podId: 'pod-1' }) })).resolves.toMatchObject({ ok: true });
  });

  it('emergency-stops active sessions', async () => {
    const created = await createRunPodPod(createSmallTestPodTemplate(), { approved: true, hours: 1 }, { createRunPodPod: async () => ({ ...mockPod, id: 'pod-emergency' }) });
    expect(created.ok).toBe(true);
    const result = await emergencyStopAllActiveSessions({ stopRunPodPod: async () => ({ ...mockPod, runtimeStatus: 'stopped' }) });
    expect(result.stoppedCount).toBeGreaterThanOrEqual(1);
  });
});
