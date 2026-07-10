-- Production foundation completion: chat, knowledge, prompts, settings, and baseline RLS policies.

create extension if not exists pgcrypto;

create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'New conversation',
  model_role text not null default 'auto' check (model_role in ('business_reasoning','research','architecture','coding','qa','database','devops','auto')),
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists conversation_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  role text not null check (role in ('system','user','assistant','tool')),
  content text not null,
  model_name text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists knowledge_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  source_type text not null default 'manual' check (source_type in ('manual','github','supabase','upload')),
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists system_prompts (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  model_role text not null check (model_role in ('business_reasoning','research','architecture','coding','qa','database','devops','auto')),
  prompt text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists app_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  is_secret boolean not null default false,
  updated_at timestamptz not null default now()
);

create or replace function is_wyndme_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from users_profile
    where user_id = auth.uid()
      and role = 'admin'
  );
$$;

alter table users_profile enable row level security;
alter table provider_credentials enable row level security;
alter table ai_sessions enable row level security;
alter table model_runtimes enable row level security;
alter table ai_tasks enable row level security;
alter table ai_task_logs enable row level security;
alter table github_repos enable row level security;
alter table supabase_projects enable row level security;
alter table approvals enable row level security;
alter table audit_logs enable row level security;
alter table cost_events enable row level security;
alter table model_registry enable row level security;
alter table conversations enable row level security;
alter table conversation_messages enable row level security;
alter table knowledge_documents enable row level security;
alter table system_prompts enable row level security;
alter table app_settings enable row level security;

-- Users can read/update their own profile. Admins can manage all profiles.
drop policy if exists users_profile_select_own_or_admin on users_profile;
create policy users_profile_select_own_or_admin on users_profile for select to authenticated
using (user_id = (select auth.uid()) or is_wyndme_admin());

drop policy if exists users_profile_update_own_or_admin on users_profile;
create policy users_profile_update_own_or_admin on users_profile for update to authenticated
using (user_id = (select auth.uid()) or is_wyndme_admin())
with check (user_id = (select auth.uid()) or is_wyndme_admin());

-- Admin-only orchestration policies. Service-role access bypasses RLS in backend code.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'provider_credentials','ai_sessions','model_runtimes','ai_tasks','ai_task_logs','github_repos','supabase_projects','approvals','audit_logs','cost_events','model_registry','knowledge_documents','system_prompts','app_settings'
  ] loop
    execute format('drop policy if exists %I on %I', table_name || '_admin_all', table_name);
    execute format('create policy %I on %I for all to authenticated using (is_wyndme_admin()) with check (is_wyndme_admin())', table_name || '_admin_all', table_name);
  end loop;
end $$;

-- Conversation ownership policies for authenticated users plus admin override.
drop policy if exists conversations_owner_or_admin on conversations;
create policy conversations_owner_or_admin on conversations for all to authenticated
using (created_by = (select auth.uid()) or is_wyndme_admin())
with check (created_by = (select auth.uid()) or is_wyndme_admin());

drop policy if exists conversation_messages_owner_or_admin on conversation_messages;
create policy conversation_messages_owner_or_admin on conversation_messages for all to authenticated
using (
  exists (
    select 1 from conversations
    where conversations.id = conversation_messages.conversation_id
      and (conversations.created_by = (select auth.uid()) or is_wyndme_admin())
  )
)
with check (
  exists (
    select 1 from conversations
    where conversations.id = conversation_messages.conversation_id
      and (conversations.created_by = (select auth.uid()) or is_wyndme_admin())
  )
);

-- Provider credentials must never be exposed through client-side policies; admin UI should use backend redacted APIs.
revoke all on provider_credentials from anon, authenticated;

insert into system_prompts (name, model_role, prompt, enabled)
values
  ('llama_business_reasoning_default','business_reasoning','You are WyndMe Private AI. Think carefully, produce business-ready analysis, and keep all outputs private by default.', true),
  ('llama_architecture_review_default','architecture','Review architecture for correctness, privacy, cost, maintainability, and production readiness.', true),
  ('qwen_coder_default','coding','You are WyndMe Qwen Coder. Implement code changes safely, preserve secrets, run tests, and summarize exact files changed.', true)
on conflict (name) do update set prompt = excluded.prompt, model_role = excluded.model_role, enabled = excluded.enabled, updated_at = now();

insert into app_settings (key, value, is_secret)
values
  ('privacy.external_model_providers_allowed', 'false'::jsonb, false),
  ('runpod.default_session_hours', '4'::jsonb, false),
  ('runpod.max_session_hours', '4'::jsonb, false),
  ('approvals.delete_pod_required', 'true'::jsonb, false),
  ('approvals.production_action_required', 'true'::jsonb, false)
on conflict (key) do update set value = excluded.value, is_secret = excluded.is_secret, updated_at = now();
