import { randomUUID } from 'node:crypto';
import { getSupabaseAdminClient, isSupabaseConfigured } from '../repositories/supabaseClient.js';
import { writeAudit } from './orchestrator.js';

export type ProductionGateStatus = 'pending' | 'passed' | 'failed' | 'blocked';

export interface ProductionGate {
  id: string;
  label: string;
  phase: string;
  status: ProductionGateStatus;
  evidence?: string;
  updatedAt?: string;
  blocker?: string;
}

const requiredGates: ProductionGate[] = [
  { id: 'phase_1_white_label_projects_chat', label: 'Phase 1 white-label projects and chat', phase: 'phase_1', status: 'passed' },
  { id: 'phase_2_studio_workspace', label: 'Phase 2 Studio workspace', phase: 'phase_2', status: 'passed' },
  { id: 'phase_3_coding_workspace', label: 'Phase 3 Coding workspace', phase: 'phase_3', status: 'passed' },
  { id: 'phase_4_workflows_workspace', label: 'Phase 4 Workflows workspace', phase: 'phase_4', status: 'passed' },
  { id: 'phase_5_integrations_workspace', label: 'Phase 5 Integrations workspace', phase: 'phase_5', status: 'passed' },
  { id: 'phase_6_privacy_analytics', label: 'Phase 6 privacy-preserving analytics', phase: 'phase_6', status: 'passed' },
  { id: 'phase_7_browser_validation', label: 'Phase 7 authenticated browser validation', phase: 'phase_7', status: 'blocked', blocker: 'Requires deployed dashboard/API URLs and browser session execution evidence.' },
  { id: 'deployed_api_validation', label: 'Deployed API validation', phase: 'deployment', status: 'blocked', blocker: 'Requires deployed API health/status validation.' },
  { id: 'deployed_dashboard_validation', label: 'Deployed dashboard validation', phase: 'deployment', status: 'blocked', blocker: 'Requires deployed dashboard URL validation.' },
  { id: 'deployed_worker_validation', label: 'Deployed worker validation', phase: 'deployment', status: 'blocked', blocker: 'Requires persistent worker health/restart validation.' },
  { id: 'monitoring_validation', label: 'Monitoring and alert validation', phase: 'monitoring', status: 'blocked', blocker: 'Requires monitoring endpoint and alert delivery evidence.' },
  { id: 'phase_8_llama_405b_validation', label: 'Phase 8 controlled Llama 405B validation', phase: 'phase_8', status: 'blocked', blocker: 'Must be launched only through Runtime Management after live preflight approval and cleanup verification.' },
];

const gateOverrides = new Map<string, ProductionGate>();

export function listProductionGates() {
  const gates = requiredGates.map((gate) => ({ ...gate, ...(gateOverrides.get(gate.id) ?? {}) }));
  const productionReady = gates.every((gate) => gate.status === 'passed');
  return { productionReady, gates, remainingBlockers: gates.filter((gate) => gate.status !== 'passed').map((gate) => ({ id: gate.id, label: gate.label, status: gate.status, blocker: gate.blocker })) };
}

export async function recordProductionGate(input: { gateId: string; status: ProductionGateStatus; evidence?: string; blocker?: string; actorId?: string }) {
  const existing = requiredGates.find((gate) => gate.id === input.gateId);
  if (!existing) throw new Error(`Unknown production gate ${input.gateId}`);
  const updated: ProductionGate = { ...existing, status: input.status, evidence: input.evidence, blocker: input.blocker, updatedAt: new Date().toISOString() };
  gateOverrides.set(input.gateId, updated);
  if (isSupabaseConfigured()) {
    try {
      await getSupabaseAdminClient().from('production_validation_events').insert({ id: randomUUID(), gate_id: input.gateId, status: input.status, evidence: input.evidence, blocker: input.blocker, actor_id: input.actorId });
    } catch { /* local fallback */ }
  }
  await writeAudit({ actorType: 'admin', action: 'production_gate.recorded', targetType: 'production_gate', targetId: input.gateId, status: input.status === 'passed' ? 'ok' : 'failed', metadata: { status: input.status, hasEvidence: Boolean(input.evidence), hasBlocker: Boolean(input.blocker) } });
  return listProductionGates();
}

export function llama405BControlledValidationPlan() {
  return {
    requiredRuntimeManagementOnly: true,
    launchTemplate: 'llama405b',
    requiredModel: 'meta-llama/Meta-Llama-3.1-405B-Instruct',
    servedModel: 'wyndme-llama-405b',
    requiredPreflights: ['runtime_policy', 'budget_projection', 'gpu_availability', 'private_image_pull', 'hugging_face_gated_access', 'admin_approval', 'auto_stop_30_minutes', 'cleanup_verification'],
    validationSteps: ['diagnostics_health', 'diagnostics_status', 'diagnostics_logs', 'v1_models', 'chat_completions', 'streaming', 'api_model_validate', 'backend_chat', 'worker_task', 'supabase_persistence', 'stop_delete_cleanup'],
  };
}
