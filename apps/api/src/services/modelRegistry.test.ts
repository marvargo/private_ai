import { afterEach, describe, expect, it, vi } from 'vitest';
import { listModelRegistry, selectModelForTask, updateModelRuntimeStatusByRoleFamily } from './modelRegistry.js';

describe('model registry routing', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('registers Llama, Qwen, and small-test QA model roles', () => {
    const registry = listModelRegistry();
    expect(registry.some((model) => model.modelFamily === 'llama' && model.modelRole === 'business_reasoning')).toBe(true);
    expect(registry.some((model) => model.modelFamily === 'qwen' && model.modelRole === 'coding')).toBe(true);
    expect(registry.some((model) => model.modelFamily === 'test' && model.modelRole === 'qa')).toBe(true);
  });

  it('routes business tasks to Llama and code tasks to Qwen', () => {
    expect(selectModelForTask('business_strategy', 'auto').model.modelFamily).toBe('llama');
    expect(selectModelForTask('code_generation', 'auto').model.modelFamily).toBe('qwen');
    expect(selectModelForTask('supabase_migration', 'auto').model.modelFamily).toBe('qwen');
  });

  it('routes QA to small-test when USE_SMALL_TEST_FOR_QA=true', () => {
    vi.stubEnv('USE_SMALL_TEST_FOR_QA', 'true');
    const selected = selectModelForTask('test_creation', 'qa').model;
    expect(selected.modelFamily).toBe('test');
    expect(selected.servedModelName).toBe('wyndme-small-test-real');
  });

  it('can keep QA on Qwen when small-test routing is explicitly disabled', () => {
    vi.stubEnv('USE_SMALL_TEST_FOR_QA', 'false');
    vi.stubEnv('RUNPOD_SMALL_TEST_MODE', 'mock');
    expect(selectModelForTask('test_creation', 'qa').model.modelFamily).toBe('qwen');
  });

  it('routes small_test_validation to test family', () => {
    vi.stubEnv('USE_SMALL_TEST_FOR_QA', 'false');
    const selected = selectModelForTask('small_test_validation', 'qa').model;
    expect(selected.modelFamily).toBe('test');
    expect(selected.servedModelName).toBe('wyndme-small-test-real');
  });

  it('updates model runtime by role and family', () => {
    const [updated] = updateModelRuntimeStatusByRoleFamily('qa', 'test', 'healthy', 'https://pod-8000.proxy.runpod.net');
    expect(updated.endpointUrl).toBe('https://pod-8000.proxy.runpod.net');
    expect(updated.status).toBe('healthy');
  });
});
