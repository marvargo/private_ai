import { describe, expect, it } from 'vitest';
import { listProductionGates, llama405BControlledValidationPlan } from './productionValidation.js';

describe('production validation gates', () => {
  it('does not report production-ready while live/deployed/llama gates are blocked', () => {
    const status = listProductionGates();
    expect(status.productionReady).toBe(false);
    expect(status.remainingBlockers.map((blocker) => blocker.id)).toContain('phase_8_llama_405b_validation');
  });

  it('requires controlled Runtime Management Llama validation', () => {
    const plan = llama405BControlledValidationPlan();
    expect(plan.requiredRuntimeManagementOnly).toBe(true);
    expect(plan.validationSteps).toContain('stop_delete_cleanup');
  });
});
