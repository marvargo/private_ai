import { describe, expect, it, beforeEach } from 'vitest';
import { getSettings, patchSettings, resetSettingsForTests } from './settings.js';

describe('settings service', () => {
  beforeEach(() => resetSettingsForTests());

  it('keeps external model providers disabled by default', () => {
    expect(getSettings().privacy.externalModelProvidersAllowed).toBe(false);
  });

  it('patches nested operator settings without dropping safety defaults', () => {
    const updated = patchSettings({ runpod: { defaultSessionHours: 2 }, budget: { maxDailyGpuBudgetUsd: 50 } });

    expect(updated.runpod.defaultSessionHours).toBe(2);
    expect(updated.runpod.maxSessionHours).toBe(4);
    expect(updated.budget.maxDailyGpuBudgetUsd).toBe(50);
    expect(updated.approvals.destructiveActionRequired).toBe(true);
  });
});
