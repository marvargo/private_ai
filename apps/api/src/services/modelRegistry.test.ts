import { describe, expect, it } from 'vitest';
import { listModelRegistry, selectModelForTask } from './modelRegistry.js';

describe('model registry routing', () => {
  it('registers Llama and Qwen model roles', () => {
    const registry = listModelRegistry();
    expect(registry.some((model) => model.modelFamily === 'llama' && model.modelRole === 'business_reasoning')).toBe(true);
    expect(registry.some((model) => model.modelFamily === 'qwen' && model.modelRole === 'coding')).toBe(true);
  });

  it('routes business tasks to Llama and code tasks to Qwen', () => {
    expect(selectModelForTask('business_strategy', 'auto').model.modelFamily).toBe('llama');
    expect(selectModelForTask('code_generation', 'auto').model.modelFamily).toBe('qwen');
    expect(selectModelForTask('supabase_migration', 'auto').model.modelFamily).toBe('qwen');
  });
});
