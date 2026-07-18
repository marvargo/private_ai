import { SupabaseClient } from '@supabase/supabase-js';
import { AppError } from '../errors/AppError.js';
import { isSupabaseConfigured, getSupabaseAdminClient } from './supabaseClient.js';
import { redactSensitiveObject } from '../utils/redaction.js';

export type DatabaseGate = {
  id: string;
  label: string;
  ok: boolean;
  status: 'passed' | 'failed' | 'blocked';
  safeDetails?: Record<string, unknown>;
};

export type DatabaseHealthReport = {
  configured: boolean;
  gates: DatabaseGate[];
};

type QueryableClient = Pick<SupabaseClient, 'from' | 'rpc'>;

function gate(id: string, label: string, ok: boolean, safeDetails?: Record<string, unknown>): DatabaseGate {
  return { id, label, ok, status: ok ? 'passed' : 'failed', safeDetails: safeDetails ? redactSensitiveObject(safeDetails) : undefined };
}

function normalizeDatabaseError(id: string, error: unknown): AppError {
  const message = error instanceof Error ? error.message : 'Database health check failed';
  return new AppError({
    message: 'Database health check failed',
    code: 'DATABASE_HEALTH_CHECK_FAILED',
    statusCode: 503,
    safeDetails: redactSensitiveObject({ gate: id, databaseError: message }),
    cause: error,
  });
}

async function probeTable(client: QueryableClient, tableName: string): Promise<DatabaseGate> {
  const { error } = await client.from(tableName).select('*', { head: true, count: 'exact' }).limit(1);
  if (error) throw normalizeDatabaseError(`table:${tableName}`, error);
  return gate(`table:${tableName}`, `Required table ${tableName} exists`, true);
}

async function probeRpc(client: QueryableClient, functionName: string, args: Record<string, unknown>): Promise<DatabaseGate> {
  const { error } = await client.rpc(functionName, args);
  if (!error) return gate(`function:${functionName}`, `Required SQL helper ${functionName} exists`, true);

  const message = String(error.message ?? '');
  const missingFunction = /function .* does not exist|Could not find the function|not found/i.test(message);
  if (missingFunction) return gate(`function:${functionName}`, `Required SQL helper ${functionName} exists`, false, { databaseError: message });
  return gate(`function:${functionName}`, `Required SQL helper ${functionName} exists`, true, { probeWarning: message });
}

export async function checkDatabaseHealth(input: {
  client?: QueryableClient;
  requiredTables: string[];
  requiredFunctions: Array<{ name: string; args?: Record<string, unknown> }>;
}): Promise<DatabaseHealthReport> {
  const configured = Boolean(input.client) || isSupabaseConfigured();
  if (!configured) {
    return {
      configured: false,
      gates: [
        { id: 'supabase.configured', label: 'Supabase URL and service role are configured', ok: false, status: 'failed' },
        { id: 'database.query', label: 'Database query succeeds', ok: false, status: 'blocked', safeDetails: { reason: 'Supabase is not configured' } },
      ],
    };
  }

  const client = input.client ?? getSupabaseAdminClient();
  const gates: DatabaseGate[] = [gate('supabase.configured', 'Supabase URL and service role are configured', true)];

  try {
    const { error } = await client.from(input.requiredTables[0] ?? 'model_registry').select('*', { head: true, count: 'exact' }).limit(1);
    if (error) throw normalizeDatabaseError('database.query', error);
    gates.push(gate('database.query', 'Database query succeeds', true));
  } catch (error) {
    if (error instanceof AppError) {
      gates.push(gate('database.query', 'Database query succeeds', false, error.safeDetails));
    } else {
      gates.push(gate('database.query', 'Database query succeeds', false, { error: String(error) }));
    }
    return { configured: true, gates };
  }

  for (const tableName of input.requiredTables) {
    try {
      gates.push(await probeTable(client, tableName));
    } catch (error) {
      gates.push(gate(`table:${tableName}`, `Required table ${tableName} exists`, false, error instanceof AppError ? error.safeDetails : { error: String(error) }));
    }
  }

  for (const helper of input.requiredFunctions) {
    gates.push(await probeRpc(client, helper.name, helper.args ?? {}));
  }

  return { configured: true, gates };
}
