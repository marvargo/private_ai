import { describe, expect, it } from 'vitest';
import { classifyTaskAction, evaluatePermission, permissionFromTools } from './permissionEngine.js';

describe('permission engine', () => {
  it('maps tools to permission levels and classifies task actions', () => {
    expect(permissionFromTools(['chat_only'])).toBe('chat_only');
    expect(permissionFromTools(['write_github_branch'])).toBe('development_write');
    expect(permissionFromTools(['runpod_start_stop'])).toBe('infrastructure_operations');
    expect(permissionFromTools(['production_gated'])).toBe('production_gated');
    expect(classifyTaskAction('app_development')).toBe('safe_development_write');
  });

  it('blocks actions without sufficient permission', async () => {
    const decision = await evaluatePermission({ permissionLevel: 'chat_only', classification: 'safe_development_write', action: 'write code' });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain('development_write');
  });

  it('creates approval records for production/destructive actions', async () => {
    const decision = await evaluatePermission({ permissionLevel: 'production_gated', classification: 'destructive_action', action: 'delete pod', riskLevel: 'critical' });
    expect(decision.allowed).toBe(false);
    expect(decision.requiresApproval).toBe(true);
    expect(decision.approval?.status).toBe('pending');
  });

  it('blocks cost-impacting actions over budget', async () => {
    const decision = await evaluatePermission({ permissionLevel: 'infrastructure_operations', classification: 'cost_impacting_action', action: 'start pod', estimatedHourlyCost: 100, hours: 4, maxDailyBudgetUsd: 10 });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain('budget');
  });
});
