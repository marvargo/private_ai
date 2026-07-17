import { afterEach, describe, expect, it, vi } from 'vitest';
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
  afterEach(() => {
    vi.unstubAllEnvs();
  });
  const mockPod = { id: 'pod-1', name: 'test', runtimeStatus: 'running', endpointUrl: 'https://pod-1.proxy.runpod.net', gpuType: 'NVIDIA H100 80GB HBM3', gpuCount: 1 };

  it('builds production model templates without provider secrets', () => {
    const llama = createLlama405BPodTemplate();
    const qwen = createQwenCoderPodTemplate();
    const test = createSmallTestPodTemplate();

    expect(llama.gpuCount).toBe(8);
    expect(llama.modelFamily).toBe('llama');
    expect(llama.env.MODEL_ID).toContain('405B');
    expect(llama.containerImage).toBe('ghcr.io/marvargo/llama405b-vllm:latest');
    expect(llama.ports).toEqual([
      { containerPort: 8000, protocol: 'http' },
      { containerPort: 8002, protocol: 'http' },
    ]);
    expect(llama.startCommand).toBe('/opt/wyndme/supervisor.py');
    expect(qwen.gpuCount).toBe(1);
    expect(qwen.modelFamily).toBe('qwen');
    expect(qwen.env.MODEL_ID).toBe('Qwen/Qwen2.5-Coder-7B-Instruct');
    expect(qwen.ports).toEqual([
      { containerPort: 8001, protocol: 'http' },
      { containerPort: 8002, protocol: 'http' },
    ]);
    expect(test.gpuCount).toBe(1);
    expect(test.modelFamily).toBe('test');
    expect(JSON.stringify([llama, qwen, test])).not.toContain('RUNPOD_API_KEY');
  });


  it('defaults small-test mode to the real GHCR image on port 8000', () => {
    const template = createSmallTestPodTemplate();
    expect(template.name).toBe('wyndme-small-test-real');
    expect(template.containerImage).toBe('ghcr.io/marvargo/private-ai-smalltest-real:latest');
    expect(template.ports).toEqual([{ containerPort: 8000, protocol: 'http' }]);
    expect(template.env.SERVED_MODEL_NAME).toBe('wyndme-small-test-real');
    expect(template.modelFamily).toBe('test');
  });

  it('uses mock small-test mode on port 3000 when requested', () => {
    vi.stubEnv('RUNPOD_SMALL_TEST_MODE', 'mock');
    const template = createSmallTestPodTemplate();
    expect(template.name).toBe('wyndme-small-test-mock');
    expect(template.ports).toEqual([{ containerPort: 3000, protocol: 'http' }]);
  });

  it('uses public vLLM image for vllm small-test mode', () => {
    vi.stubEnv('RUNPOD_SMALL_TEST_MODE', 'vllm');
    const template = createSmallTestPodTemplate();
    expect(template.containerImage).toBe('vllm/vllm-openai:latest');
    expect(template.ports).toEqual([{ containerPort: 8000, protocol: 'http' }]);
    expect(template.startCommand).toContain('TinyLlama/TinyLlama-1.1B-Chat-v1.0');
  });

  it('uses explicit real mode with GHCR image and port 8000', () => {
    vi.stubEnv('RUNPOD_SMALL_TEST_MODE', 'real');
    const template = createSmallTestPodTemplate();
    expect(template.containerImage).toBe('ghcr.io/marvargo/private-ai-smalltest-real:latest');
    expect(template.ports[0].containerPort).toBe(8000);
  });

  it('attaches RunPod registry auth to private small-test images when configured', () => {
    vi.stubEnv('RUNPOD_SMALL_TEST_MODE', 'real');
    vi.stubEnv('RUNPOD_SMALL_TEST_CONTAINER_REGISTRY_AUTH_ID', 'registry-auth-1');
    const template = createSmallTestPodTemplate();
    expect(template.containerRegistryAuthId).toBe('registry-auth-1');
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

  it('small-test pod creation updates the test QA model endpoint in memory', async () => {
    const result = await createRunPodPod(createSmallTestPodTemplate(), { approved: true, hours: 1 }, { createRunPodPod: async () => mockPod });
    expect(result.ok).toBe(true);
    const { selectModelForTask } = await import('./modelRegistry.js');
    const selected = selectModelForTask('small_test_validation', 'qa').model;
    expect(selected.modelFamily).toBe('test');
    expect(selected.endpointUrl).toBe(mockPod.endpointUrl);
  });

});
