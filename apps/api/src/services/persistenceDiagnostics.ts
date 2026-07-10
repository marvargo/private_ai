import { getSupabaseAdminClient, isSupabaseConfigured } from '../repositories/supabaseClient.js';

function prefix(prefix: string, id?: string | null) {
  if (!id) return undefined;
  return id.startsWith(`${prefix}_`) ? id : `${prefix}_${id}`;
}

export async function latestRunPodValidationPersistence() {
  if (!isSupabaseConfigured()) return { configured: false, reason: 'Supabase admin client is not configured.' };
  const client = getSupabaseAdminClient();
  const { data: session, error: sessionError } = await client
    .from('ai_sessions')
    .select('id,pod_id,model_id,model_role,status,auto_stop_at,endpoint_url,created_at')
    .not('pod_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (sessionError) throw sessionError;

  const sessionId = session?.id as string | undefined;
  const [{ data: runtimes, error: runtimeError }, { data: costEvents, error: costError }, { data: auditLogs, error: auditError }] = await Promise.all([
    sessionId ? client.from('model_runtimes').select('id,session_id,model_id,model_role,status,api_base_url,updated_at').eq('session_id', sessionId).order('updated_at', { ascending: false }).limit(5) : Promise.resolve({ data: [], error: null }),
    sessionId ? client.from('cost_events').select('id,session_id,event_type,estimated_hourly_cost,estimated_total_cost,created_at').eq('session_id', sessionId).order('created_at', { ascending: false }).limit(10) : Promise.resolve({ data: [], error: null }),
    session?.pod_id ? client.from('audit_logs').select('id,action,target_type,target_id,status,created_at').or(`target_id.eq.${session.pod_id},target_id.eq.${prefix('session', sessionId)}`).order('created_at', { ascending: false }).limit(20) : Promise.resolve({ data: [], error: null }),
  ]);
  if (runtimeError) throw runtimeError;
  if (costError) throw costError;
  if (auditError) throw auditError;

  return {
    configured: true,
    latestSession: session ? { ...session, id: prefix('session', session.id as string) } : undefined,
    modelRuntimeCount: runtimes?.length ?? 0,
    costEventCount: costEvents?.length ?? 0,
    auditLogCount: auditLogs?.length ?? 0,
    latestRuntimes: runtimes ?? [],
    latestCostEvents: costEvents ?? [],
    latestAuditLogs: auditLogs ?? [],
  };
}
