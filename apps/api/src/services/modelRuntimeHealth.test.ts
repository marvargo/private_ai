import { describe, expect, it } from 'vitest';
import { assertModelRuntimeHealthy, checkModelRuntime, pollModelRuntimes } from './modelRuntimeHealth.js';
import { listModelRegistry, updateModelRuntimeStatus } from './modelRegistry.js';

describe('model runtime health manager', () => {
  it('marks mocked OpenAI-compatible runtime healthy via /v1/models', async () => {
    const model = listModelRegistry().find((entry) => entry.modelFamily === 'llama')!;
    const result = await checkModelRuntime({ ...model, endpointUrl: 'http://runtime.test' }, { fetch: async () => ({ ok: true, status: 200 }) });
    expect(result.status).toBe('healthy');
    expect(result.detail).toContain('/v1/models');
  });

  it('falls back to /health when /v1/models is unavailable', async () => {
    const model = listModelRegistry().find((entry) => entry.modelFamily === 'qwen')!;
    const calls: string[] = [];
    const result = await checkModelRuntime({ ...model, endpointUrl: 'http://qwen.test' }, { fetch: async (url) => { calls.push(url); return { ok: calls.length > 1, status: calls.length > 1 ? 200 : 404 }; } });
    expect(result.status).toBe('healthy');
    expect(calls).toEqual(['http://qwen.test/v1/models', 'http://qwen.test/health']);
  });

  it('polls configured runtime registry entries', async () => {
    const result = await pollModelRuntimes({ fetch: async () => ({ ok: true, status: 200 }) });
    expect(result.results.length).toBeGreaterThan(0);
  });

  it('blocks task execution when required model is unhealthy or stopped', () => {
    const coding = listModelRegistry().find((entry) => entry.modelRole === 'coding')!;
    updateModelRuntimeStatus(coding.id, 'stopped');
    expect(() => assertModelRuntimeHealthy('app_development', 'coding')).toThrow(/Required private model/);
  });
});
