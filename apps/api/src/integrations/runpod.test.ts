import { describe, expect, it } from 'vitest';
import { createRunPodPod, endpointFromPorts } from './runpod.js';

describe('RunPod endpoint URL normalization', () => {
  it('uses the stable pod-id/internal-port HTTP proxy URL', () => {
    expect(endpointFromPorts({
      id: 'pod123',
      runtime: { ports: [{ ip: '10.0.0.1', privatePort: 8000, publicPort: 60910, type: 'http' }] },
    })).toBe('https://pod123-8000.proxy.runpod.net');
  });

  it('passes container registry auth IDs into pod create input', async () => {
    const originalFetch = globalThis.fetch;
    const calls: unknown[] = [];
    globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
      calls.push(JSON.parse(String(init?.body)));
      return new Response(JSON.stringify({
        data: {
          podFindAndDeployOnDemand: {
            id: 'pod-private',
            name: 'private-image',
            desiredStatus: 'RUNNING',
            runtime: { uptimeInSeconds: 1, ports: [{ privatePort: 8000, type: 'http' }] },
            machine: { gpuDisplayName: 'NVIDIA H100', gpuCount: 1 },
          },
        },
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    }) as typeof fetch;
    process.env.RUNPOD_API_KEY = 'test-runpod-key';

    try {
      await createRunPodPod({
        name: 'private-image',
        gpuCount: 1,
        gpuType: 'NVIDIA H100',
        volumeGb: 20,
        containerImage: 'ghcr.io/marvargo/private-ai-smalltest-real:latest',
        containerRegistryAuthId: 'registry-auth-1',
        ports: [{ containerPort: 8000, protocol: 'http' }],
        env: {},
        volumeMountPath: '/workspace',
        startCommand: '',
      });
    } finally {
      globalThis.fetch = originalFetch;
      delete process.env.RUNPOD_API_KEY;
    }

    expect(calls).toHaveLength(1);
    expect((calls[0] as any).variables.input.containerRegistryAuthId).toBe('registry-auth-1');
  });
});
