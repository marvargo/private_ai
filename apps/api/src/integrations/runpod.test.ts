import { describe, expect, it } from 'vitest';
import { endpointFromPorts } from './runpod.js';

describe('RunPod endpoint URL normalization', () => {
  it('uses the stable pod-id/internal-port HTTP proxy URL', () => {
    expect(endpointFromPorts({
      id: 'pod123',
      runtime: { ports: [{ ip: '10.0.0.1', privatePort: 8000, publicPort: 60910, type: 'http' }] },
    })).toBe('https://pod123-8000.proxy.runpod.net');
  });
});
