import { PermissionLevel, ToolActionClassification } from '@wyndme/shared';
import { requestApproval } from './approvals.js';
import { assertStartAllowed } from './costControls.js';
import { writeAudit } from './orchestrator.js';

const permissionRank: Record<PermissionLevel, number> = {
  chat_only: 0,
  read_tools: 1,
  development_write: 2,
  infrastructure_operations: 3,
  production_gated: 4,
};

const requiredPermission: Record<ToolActionClassification, PermissionLevel> = {
  safe_read: 'read_tools',
  safe_development_write: 'development_write',
  cost_impacting_action: 'infrastructure_operations',
  sensitive_data_action: 'production_gated',
  production_action: 'production_gated',
  destructive_action: 'production_gated',
  external_sharing_action: 'production_gated',
};

export interface PermissionDecisionInput {
  permissionLevel: PermissionLevel;
  classification: ToolActionClassification;
  action: string;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  estimatedHourlyCost?: number;
  hours?: number;
  maxSessionHours?: number;
  maxDailyBudgetUsd?: number;
  approved?: boolean;
}

export async function evaluatePermission(input: PermissionDecisionInput) {
  const required = requiredPermission[input.classification];
  if (permissionRank[input.permissionLevel] < permissionRank[required]) {
    await writeAudit({ actorType: 'system', action: 'permission.blocked', targetType: 'permission', targetId: input.action, status: 'blocked', metadata: { required, provided: input.permissionLevel, classification: input.classification } });
    return { allowed: false, reason: `${input.classification} requires ${required} permission.`, requiresApproval: false };
  }

  if (input.classification === 'cost_impacting_action') {
    const gate = assertStartAllowed(input.estimatedHourlyCost ?? 0, input.hours ?? 1, { maxSessionHours: input.maxSessionHours ?? 4, maxDailyBudgetUsd: input.maxDailyBudgetUsd });
    if (!gate.allowed) return { allowed: false, reason: gate.reason, requiresApproval: false };
  }

  const approvalRequired = ['production_action', 'destructive_action', 'external_sharing_action'].includes(input.classification)
    || input.riskLevel === 'critical'
    || (input.classification === 'cost_impacting_action' && (input.estimatedHourlyCost ?? 0) * (input.hours ?? 1) > 20);

  if (approvalRequired && !input.approved) {
    const approval = await requestApproval({
      approvalType: input.classification === 'destructive_action' ? 'production_action' : 'production_action',
      requestedAction: input.action,
      riskLevel: input.riskLevel ?? (input.classification === 'destructive_action' ? 'critical' : 'high'),
      requestedBy: 'system',
      reason: `${input.classification} requires approval`,
    });
    await writeAudit({ actorType: 'system', action: 'permission.waiting_approval', targetType: 'approval', targetId: approval.id, status: 'blocked', metadata: { action: input.action, classification: input.classification } });
    return { allowed: false, reason: 'Approval required', requiresApproval: true, approval };
  }

  return { allowed: true, requiresApproval: false };
}

export function permissionFromTools(tools: string[]): PermissionLevel {
  if (tools.includes('production_gated')) return 'production_gated';
  if (tools.includes('runpod_start_stop')) return 'infrastructure_operations';
  if (tools.includes('write_github_branch') || tools.includes('draft_supabase_migration')) return 'development_write';
  if (tools.some((tool) => tool.startsWith('read_')) || tools.includes('read_tools')) return 'read_tools';
  return 'chat_only';
}

export function classifyTaskAction(taskType: string): ToolActionClassification {
  if (['deployment_review'].includes(taskType)) return 'production_action';
  if (['app_development', 'bug_fix'].includes(taskType)) return 'safe_development_write';
  if (['supabase_schema'].includes(taskType)) return 'sensitive_data_action';
  if (taskType.includes('runpod')) return 'cost_impacting_action';
  if (taskType.includes('github') || taskType.includes('research')) return 'safe_read';
  return 'safe_read';
}
