import { describe, expect, it } from 'vitest';
import { listApprovals, requestApproval, requireApprovalForRisk, resolveApproval } from './approvals.js';

describe('approvals', () => {
  it('requires explicit approval for high risk operations', () => {
    expect(requireApprovalForRisk('critical', false).allowed).toBe(false);
    expect(requireApprovalForRisk('medium', false).allowed).toBe(true);
  });

  it('tracks approval lifecycle', async () => {
    const approval = await requestApproval({ approvalType: 'runpod_start', requestedAction: 'start qwen pod', riskLevel: 'high', requestedBy: 'admin' });
    expect((await listApprovals('pending')).some((item) => item.id === approval.id)).toBe(true);
    expect((await resolveApproval(approval.id, 'approved')).status).toBe('approved');
  });
});
