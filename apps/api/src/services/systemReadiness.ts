import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { env } from '../utils/env.js';
import { checkDatabaseHealth, DatabaseGate } from '../repositories/databaseHealth.js';
import { redactSensitiveObject } from '../utils/redaction.js';

export type ReadinessGate = {
  id: string;
  label: string;
  status: 'passed' | 'failed' | 'blocked';
  safeDetails?: Record<string, unknown>;
};

export type SystemReadinessReport = {
  generatedAt: string;
  overallStatus: 'ready' | 'not_ready';
  gates: ReadinessGate[];
};

const REQUIRED_TABLES = [
  'model_registry',
  'ai_sessions',
  'ai_tasks',
  'audit_logs',
  'cost_events',
  'projects',
  'project_members',
  'project_invitations',
  'project_activity_events',
  'conversations',
  'conversation_messages',
];

const REQUIRED_FUNCTIONS = [
  { name: 'claim_next_ai_task', args: { worker_id: 'readiness-probe', lock_seconds: 1 } },
  { name: 'is_project_owner', args: { p_project_id: '00000000-0000-0000-0000-000000000000', p_user_id: '00000000-0000-0000-0000-000000000000' } },
  { name: 'is_project_member', args: { p_project_id: '00000000-0000-0000-0000-000000000000', p_user_id: '00000000-0000-0000-0000-000000000000' } },
  { name: 'get_project_role', args: { p_project_id: '00000000-0000-0000-0000-000000000000', p_user_id: '00000000-0000-0000-0000-000000000000' } },
  { name: 'has_project_permission', args: { p_project_id: '00000000-0000-0000-0000-000000000000', p_permission: 'view_project', p_user_id: '00000000-0000-0000-0000-000000000000' } },
  { name: 'can_access_conversation', args: { p_conversation_id: '00000000-0000-0000-0000-000000000000', p_user_id: '00000000-0000-0000-0000-000000000000' } },
  { name: 'can_edit_conversation', args: { p_conversation_id: '00000000-0000-0000-0000-000000000000', p_user_id: '00000000-0000-0000-0000-000000000000' } },
];

const REQUIRED_RLS_TABLES = [
  'projects',
  'project_members',
  'project_invitations',
  'project_activity_events',
  'conversations',
  'conversation_messages',
  'capability_usage_events',
];

function makeGate(id: string, label: string, passed: boolean, safeDetails?: Record<string, unknown>): ReadinessGate {
  return { id, label, status: passed ? 'passed' : 'failed', safeDetails: safeDetails ? redactSensitiveObject(safeDetails) : undefined };
}

function migrationsDirectory() {
  return resolve(process.cwd(), 'supabase', 'migrations');
}

export function checkMigrationFiles(directory = migrationsDirectory()): ReadinessGate {
  if (!existsSync(directory)) return makeGate('migrations.files', 'Migration files 001 through latest exist', false, { directory });
  const migrationNumbers = readdirSync(directory)
    .map((file) => file.match(/^(\d{3})_.*\.sql$/)?.[1])
    .filter((value): value is string => Boolean(value))
    .map(Number)
    .sort((a, b) => a - b);
  if (migrationNumbers.length === 0) return makeGate('migrations.files', 'Migration files 001 through latest exist', false, { count: 0 });
  const missing: number[] = [];
  for (let index = 1; index <= migrationNumbers[migrationNumbers.length - 1]; index += 1) {
    if (!migrationNumbers.includes(index)) missing.push(index);
  }
  return makeGate('migrations.files', 'Migration files 001 through latest exist', missing.length === 0, {
    latest: migrationNumbers[migrationNumbers.length - 1],
    missing: missing.map((number) => String(number).padStart(3, '0')),
  });
}

export function checkRlsPolicyFiles(directory = migrationsDirectory()): ReadinessGate {
  if (!existsSync(directory)) return makeGate('rls.policies', 'Required RLS policy definitions exist in migrations', false, { directory });
  const sql = readdirSync(directory)
    .filter((file) => file.endsWith('.sql'))
    .map((file) => readFileSync(join(directory, file), 'utf8'))
    .join('\n')
    .toLowerCase();
  const missingTables = REQUIRED_RLS_TABLES.filter((table) => !sql.includes(`alter table ${table}`) && !sql.includes(`alter table public.${table}`));
  const missingPolicies = REQUIRED_RLS_TABLES.filter((table) => !sql.includes(` on ${table}`) && !sql.includes(` on public.${table}`));
  return makeGate('rls.policies', 'Required RLS policy definitions exist in migrations', missingTables.length === 0 && missingPolicies.length === 0, {
    missingTables,
    missingPolicies,
  });
}

export function checkVaultKmsConfiguration(): ReadinessGate {
  const configured = Boolean(process.env.AWS_KMS_KEY_ID || process.env.KMS_KEY_ID || process.env.VAULT_ADDR || env.ENCRYPTION_KEY);
  return makeGate('vault_kms.configured', 'Vault/KMS or development encryption configuration is present', configured, {
    kmsConfigured: Boolean(process.env.AWS_KMS_KEY_ID || process.env.KMS_KEY_ID),
    vaultConfigured: Boolean(process.env.VAULT_ADDR),
    developmentEncryptionConfigured: Boolean(env.ENCRYPTION_KEY),
  });
}

export async function getSystemReadiness(input: { databaseHealth?: () => Promise<{ gates: DatabaseGate[] }> } = {}): Promise<SystemReadinessReport> {
  const database = input.databaseHealth
    ? await input.databaseHealth()
    : await checkDatabaseHealth({ requiredTables: REQUIRED_TABLES, requiredFunctions: REQUIRED_FUNCTIONS });

  const gates: ReadinessGate[] = [
    ...database.gates.map((databaseGate) => ({ id: databaseGate.id, label: databaseGate.label, status: databaseGate.status, safeDetails: databaseGate.safeDetails })),
    checkMigrationFiles(),
    checkRlsPolicyFiles(),
    makeGate('runpod.configured', 'RunPod API is configured', Boolean(env.RUNPOD_API_KEY)),
    checkVaultKmsConfiguration(),
  ];

  const workerLockGate = gates.find((gate) => gate.id === 'function:claim_next_ai_task');
  gates.push({
    id: 'worker.lock_function',
    label: 'Worker lock function exists',
    status: workerLockGate?.status ?? 'blocked',
    safeDetails: workerLockGate?.safeDetails ?? { reason: 'Worker lock function was not probed' },
  });

  return {
    generatedAt: new Date().toISOString(),
    overallStatus: gates.every((gate) => gate.status === 'passed') ? 'ready' : 'not_ready',
    gates,
  };
}
