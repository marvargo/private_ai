import { env } from '../utils/env.js';
import { getSupabaseAdminClient, isSupabaseConfigured } from '../repositories/supabaseClient.js';
import { decryptSecret } from './crypto.js';
import { ProviderName } from './credentialVault.js';

const ENV_BY_PROVIDER: Record<ProviderName, string> = {
  runpod: 'RUNPOD_API_KEY',
  github: 'GITHUB_TOKEN',
  supabase: 'SUPABASE_ACCESS_TOKEN',
  huggingface: 'HF_TOKEN',
  llama_runtime: 'LLAMA_SERVER_API_KEY',
  qwen_runtime: 'QWEN_SERVER_API_KEY',
};

function encryptionKey() {
  return env.ENCRYPTION_KEY;
}

export async function getProviderSecret(providerName: ProviderName, label = 'default') {
  if (isSupabaseConfigured() && encryptionKey()) {
    try {
      const { data, error } = await getSupabaseAdminClient()
        .from('provider_credentials')
        .select('encrypted_value,status')
        .eq('provider_name', providerName)
        .eq('credential_label', label)
        .neq('status', 'disabled')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data?.encrypted_value) {
        return decryptSecret(String(data.encrypted_value), encryptionKey()!);
      }
    } catch {
      // Fall back to env.
    }
  }

  const envName = ENV_BY_PROVIDER[providerName];
  const value = process.env[envName];

  if (value) return value;

  throw new Error(`Missing ${providerName} credential. Add it to provider credential vault or ${envName}.`);
}

export async function getOptionalProviderSecret(providerName: ProviderName, label = 'default') {
  try {
    return await getProviderSecret(providerName, label);
  } catch {
    return undefined;
  }
}

export const getRunPodApiKey = () => getProviderSecret('runpod');
export const getGitHubToken = () => getProviderSecret('github');
export const getHuggingFaceToken = () => getProviderSecret('huggingface');
export const getSupabaseAccessToken = () => getProviderSecret('supabase', 'management');
export const getLlamaRuntimeApiKey = () => getProviderSecret('llama_runtime');
export const getQwenRuntimeApiKey = () => getProviderSecret('qwen_runtime');
export const getOptionalLlamaRuntimeApiKey = () => getOptionalProviderSecret('llama_runtime');
export const getOptionalQwenRuntimeApiKey = () => getOptionalProviderSecret('qwen_runtime');
