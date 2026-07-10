import { randomUUID } from 'node:crypto';
import { getSupabaseAdminClient, isSupabaseConfigured } from '../repositories/supabaseClient.js';
import { env } from '../utils/env.js';
import { decryptSecret, encryptSecret } from './crypto.js';

export type ProviderName = 'runpod' | 'github' | 'supabase' | 'huggingface' | 'llama_runtime' | 'qwen_runtime';
export type CredentialStatus = 'untested' | 'valid' | 'invalid' | 'disabled';

export interface CredentialRecord {
  id: string;
  providerName: ProviderName;
  credentialLabel: string;
  encryptedValue: string;
  status: CredentialStatus;
  createdAt: string;
  updatedAt: string;
  lastTestedAt?: string;
}

export interface RedactedCredentialRecord extends Omit<CredentialRecord, 'encryptedValue'> {
  redactedValue: string;
}

type CredentialRow = {
  id: string;
  provider_name: ProviderName;
  credential_label: string;
  encrypted_value: string;
  status: CredentialStatus;
  created_at: string;
  updated_at: string;
  last_tested_at?: string | null;
};

const credentials = new Map<string, CredentialRecord>();

function id() {
  return `cred_${randomUUID()}`;
}

function stripPrefix(id: string) {
  return id.replace(/^cred_/, '');
}

function withPrefix(id: string) {
  return id.startsWith('cred_') ? id : `cred_${id}`;
}

function requireEncryptionKey() {
  if (!env.ENCRYPTION_KEY) throw new Error('ENCRYPTION_KEY is required before storing credentials');
  return env.ENCRYPTION_KEY;
}

function fromRow(row: CredentialRow): CredentialRecord {
  return {
    id: withPrefix(row.id),
    providerName: row.provider_name,
    credentialLabel: row.credential_label,
    encryptedValue: row.encrypted_value,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastTestedAt: row.last_tested_at ?? undefined,
  };
}

export function redactSecret(value: string) {
  if (!value) return '';
  if (value.length <= 8) return '••••';
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}

export function redactCredential(record: CredentialRecord): RedactedCredentialRecord {
  let redactedValue = 'encrypted';
  try {
    redactedValue = redactSecret(decryptSecret(record.encryptedValue, requireEncryptionKey()));
  } catch {
    redactedValue = 'unreadable';
  }
  const { encryptedValue: _encryptedValue, ...safe } = record;
  return { ...safe, redactedValue };
}

export async function createCredential(input: { providerName: ProviderName; credentialLabel: string; value: string }) {
  const now = new Date().toISOString();
  const record: CredentialRecord = {
    id: id(),
    providerName: input.providerName,
    credentialLabel: input.credentialLabel,
    encryptedValue: encryptSecret(input.value, requireEncryptionKey()),
    status: 'untested',
    createdAt: now,
    updatedAt: now,
  };
  credentials.set(record.id, record);
  if (!isSupabaseConfigured()) return redactCredential(record);
  try {
    const { data, error } = await getSupabaseAdminClient().from('provider_credentials').insert({
      id: stripPrefix(record.id),
      provider_name: record.providerName,
      credential_label: record.credentialLabel,
      encrypted_value: record.encryptedValue,
      status: record.status,
      created_at: record.createdAt,
      updated_at: record.updatedAt,
    }).select('*').single();
    if (error) throw error;
    return redactCredential(fromRow(data as CredentialRow));
  } catch {
    return redactCredential(record);
  }
}

export async function listCredentials(providerName?: ProviderName) {
  if (isSupabaseConfigured()) {
    try {
      let query = getSupabaseAdminClient().from('provider_credentials').select('*').order('created_at', { ascending: false }).limit(100);
      if (providerName) query = query.eq('provider_name', providerName);
      const { data, error } = await query;
      if (error) throw error;
      return ((data ?? []) as CredentialRow[]).map(fromRow).map(redactCredential);
    } catch {
      // Fall through to local records.
    }
  }
  return Array.from(credentials.values())
    .filter((record) => !providerName || record.providerName === providerName)
    .map(redactCredential);
}

export async function getCredentialSecret(id: string) {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await getSupabaseAdminClient().from('provider_credentials').select('*').eq('id', stripPrefix(id)).single();
      if (error) throw error;
      return decryptSecret(fromRow(data as CredentialRow).encryptedValue, requireEncryptionKey());
    } catch {
      // Fall through to local lookup.
    }
  }
  const record = credentials.get(id);
  if (!record) throw new Error(`Credential ${id} not found`);
  return decryptSecret(record.encryptedValue, requireEncryptionKey());
}

export async function updateCredentialStatus(id: string, status: CredentialStatus) {
  const now = new Date().toISOString();
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await getSupabaseAdminClient()
        .from('provider_credentials')
        .update({ status, updated_at: now, last_tested_at: now })
        .eq('id', stripPrefix(id))
        .select('*')
        .single();
      if (error) throw error;
      return redactCredential(fromRow(data as CredentialRow));
    } catch {
      // Fall through to local update.
    }
  }
  const record = credentials.get(id);
  if (!record) throw new Error(`Credential ${id} not found`);
  const updated = { ...record, status, updatedAt: now, lastTestedAt: now };
  credentials.set(id, updated);
  return redactCredential(updated);
}

export async function deleteCredential(id: string, approved: boolean) {
  if (!approved) throw new Error('Explicit approval is required before deleting credentials');
  if (isSupabaseConfigured()) {
    try {
      const { error } = await getSupabaseAdminClient().from('provider_credentials').delete().eq('id', stripPrefix(id));
      if (error) throw error;
      credentials.delete(id);
      return { ok: true };
    } catch {
      // Fall through to local delete.
    }
  }
  const existed = credentials.delete(id);
  return { ok: existed };
}
