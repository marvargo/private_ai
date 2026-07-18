import { randomUUID } from 'node:crypto';
import { getSupabaseAdminClient, isSupabaseConfigured } from '../repositories/supabaseClient.js';
import { AppError } from '../errors/AppError.js';
import { getDevelopmentInMemoryStores } from '../repositories/index.js';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';
export type ApprovalRisk = 'low' | 'medium' | 'high' | 'critical';

export interface ApprovalRecord {
  id: string;
  approvalType: 'runpod_start' | 'runpod_delete' | 'credential_delete' | 'production_action';
  requestedAction: string;
  riskLevel: ApprovalRisk;
  status: ApprovalStatus;
  reason?: string;
  requestedBy: 'admin' | 'system' | 'worker';
  createdAt: string;
  resolvedAt?: string;
}

type ApprovalRow = {
  id: string;
  approval_type: ApprovalRecord['approvalType'];
  requested_action: string;
  risk_level: ApprovalRisk;
  status: ApprovalStatus;
  requested_by?: string | null;
  reason?: string | null;
  created_at: string;
  resolved_at?: string | null;
};


function stripPrefix(id: string) {
  return id.replace(/^approval_/, '');
}

function withPrefix(id: string) {
  return id.startsWith('approval_') ? id : `approval_${id}`;
}

function toRecord(row: ApprovalRow): ApprovalRecord {
  return {
    id: withPrefix(row.id),
    approvalType: row.approval_type,
    requestedAction: row.requested_action,
    riskLevel: row.risk_level,
    status: row.status,
    requestedBy: (row.requested_by as ApprovalRecord['requestedBy']) ?? 'admin',
    reason: row.reason ?? undefined,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at ?? undefined,
  };
}

function localRequestApproval(input: Omit<ApprovalRecord, 'id' | 'status' | 'createdAt'>) {
  const record: ApprovalRecord = {
    id: `approval_${randomUUID()}`,
    status: 'pending',
    createdAt: new Date().toISOString(),
    ...input,
  };
  getDevelopmentInMemoryStores().approvals.set(record.id, record);
  return record;
}

export async function requestApproval(input: Omit<ApprovalRecord, 'id' | 'status' | 'createdAt'>) {
  if (!isSupabaseConfigured()) return localRequestApproval(input);
  const local: ApprovalRecord = {
    id: `approval_${randomUUID()}`,
    status: 'pending',
    createdAt: new Date().toISOString(),
    ...input,
  };
  try {
    const { data, error } = await getSupabaseAdminClient().from('approvals').insert({
      id: stripPrefix(local.id),
      approval_type: local.approvalType,
      requested_action: local.requestedAction,
      risk_level: local.riskLevel,
      status: local.status,
      requested_by: local.requestedBy,
      reason: local.reason,
    }).select('*').single();
    if (error) throw error;
    return toRecord(data as ApprovalRow);
  } catch (error) {
    throw new AppError({ message: 'Failed to request approval', code: 'APPROVAL_REQUEST_FAILED', statusCode: 503, safeDetails: { approvalType: input.approvalType, riskLevel: input.riskLevel }, cause: error });
  }
}

export async function resolveApproval(id: string, status: Exclude<ApprovalStatus, 'pending'>, reason?: string) {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await getSupabaseAdminClient()
        .from('approvals')
        .update({ status, reason, resolved_at: new Date().toISOString() })
        .eq('id', stripPrefix(id))
        .select('*')
        .single();
      if (error) throw error;
      return toRecord(data as ApprovalRow);
    } catch (error) {
      throw new AppError({ message: 'Failed to resolve approval', code: 'APPROVAL_RESOLVE_FAILED', statusCode: 503, safeDetails: { approvalId: id, status }, cause: error });
    }
  }
  const { approvals } = getDevelopmentInMemoryStores();
  const existing = approvals.get(id);
  if (!existing) throw new Error(`Approval ${id} not found`);
  const updated = { ...existing, status, reason, resolvedAt: new Date().toISOString() };
  approvals.set(id, updated);
  return updated;
}

export function requireApprovalForRisk(riskLevel: ApprovalRisk, approved: boolean) {
  if ((riskLevel === 'high' || riskLevel === 'critical') && !approved) {
    return { allowed: false, reason: `${riskLevel} risk action requires explicit approval` };
  }
  return { allowed: true };
}

export async function listApprovals(status?: ApprovalStatus) {
  if (isSupabaseConfigured()) {
    try {
      let query = getSupabaseAdminClient().from('approvals').select('*').order('created_at', { ascending: false }).limit(100);
      if (status) query = query.eq('status', status);
      const { data, error } = await query;
      if (error) throw error;
      return ((data ?? []) as ApprovalRow[]).map(toRecord);
    } catch (error) {
      throw new AppError({ message: 'Failed to list approvals', code: 'APPROVALS_LIST_FAILED', statusCode: 503, safeDetails: { status }, cause: error });
    }
  }
  const { approvals } = getDevelopmentInMemoryStores();
  return Array.from(approvals.values()).filter((approval) => !status || approval.status === status);
}
