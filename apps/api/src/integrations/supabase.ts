import { env } from '../utils/env.js';

export interface SupabaseDiagnostics {
  configured: boolean;
  projectUrl?: string;
  keyLooksPublishable: boolean;
  keyLooksSecret: boolean;
  restReachable: boolean;
  modelRegistryTableReady: boolean;
  authAdminAvailable: boolean;
  issues: string[];
}

async function fetchSupabase(path: string) {
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Supabase URL/key missing');
  return fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}${path}`, {
    headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` },
  });
}

export async function diagnoseSupabase(): Promise<SupabaseDiagnostics> {
  const key = env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  const diagnostics: SupabaseDiagnostics = {
    configured: Boolean(env.NEXT_PUBLIC_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY),
    projectUrl: env.NEXT_PUBLIC_SUPABASE_URL,
    keyLooksPublishable: key.startsWith('sb_publishable_') || key.startsWith('eyJ'),
    keyLooksSecret: key.startsWith('sb_secret_'),
    restReachable: false,
    modelRegistryTableReady: false,
    authAdminAvailable: false,
    issues: [],
  };

  if (!diagnostics.configured) {
    diagnostics.issues.push('Supabase URL and service role key are required.');
    return diagnostics;
  }
  if (diagnostics.keyLooksPublishable && !diagnostics.keyLooksSecret) diagnostics.issues.push('Configured SUPABASE_SERVICE_ROLE_KEY appears to be publishable/anon, not a service-role secret.');

  try {
    const registry = await fetchSupabase('/rest/v1/model_registry?select=id&limit=1');
    diagnostics.restReachable = registry.status !== 0;
    diagnostics.modelRegistryTableReady = registry.ok;
    if (!registry.ok) diagnostics.issues.push(`model_registry check failed with HTTP ${registry.status}; migrations may not be applied.`);
  } catch (error) {
    diagnostics.issues.push(`Supabase REST check failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  try {
    const auth = await fetchSupabase('/auth/v1/admin/users?page=1&per_page=1');
    diagnostics.authAdminAvailable = auth.ok;
    if (!auth.ok) diagnostics.issues.push(`Auth admin check failed with HTTP ${auth.status}; service-role key is required for backend admin operations.`);
  } catch (error) {
    diagnostics.issues.push(`Supabase auth admin check failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  return diagnostics;
}
