import { isSupabaseConfigured } from '../repositories/supabaseClient.js';
import { listCredentials, ProviderName } from './credentialVault.js';

const REQUIRED: Array<{ providerName: ProviderName; credentialLabel: string; envName: string }> = [
  { providerName: 'runpod', credentialLabel: 'default', envName: 'RUNPOD_API_KEY' },
  { providerName: 'github', credentialLabel: 'default', envName: 'GITHUB_TOKEN' },
  { providerName: 'huggingface', credentialLabel: 'default', envName: 'HF_TOKEN' },
  { providerName: 'supabase', credentialLabel: 'management', envName: 'SUPABASE_ACCESS_TOKEN' },
  { providerName: 'llama_runtime', credentialLabel: 'default', envName: 'LLAMA_SERVER_API_KEY' },
  { providerName: 'qwen_runtime', credentialLabel: 'default', envName: 'QWEN_SERVER_API_KEY' },
];

export async function credentialRequirements() {
  const credentials = await listCredentials();
  return Promise.all(REQUIRED.map(async (requirement) => {
    const vaultAvailable = credentials.some(
      (credential) => credential.providerName === requirement.providerName
        && credential.credentialLabel === requirement.credentialLabel
        && credential.status !== 'disabled',
    );
    const envFallbackAvailable = Boolean(process.env[requirement.envName]);
    return {
      providerName: requirement.providerName,
      credentialLabel: requirement.credentialLabel,
      vaultAvailable,
      envFallbackAvailable,
      status: vaultAvailable || envFallbackAvailable ? 'available' : 'missing',
    };
  }));
}
