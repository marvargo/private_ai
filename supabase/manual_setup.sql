-- WyndMe Private AI manual Supabase setup
-- Run this once in the Supabase Dashboard SQL Editor for project zhcnrxcuyrxnrdqrfcfz.
-- This creates the orchestration schema and seeds the initial multi-model registry.

begin;

create extension if not exists pgcrypto;

create table if not exists users_profile (id uuid primary key default gen_random_uuid(), user_id uuid not null, email text not null, full_name text, role text not null default 'admin', created_at timestamptz default now(), updated_at timestamptz default now());
create table if not exists provider_credentials (id uuid primary key default gen_random_uuid(), provider_name text not null, credential_label text not null, encrypted_value text not null, status text default 'untested', created_by uuid, created_at timestamptz default now(), updated_at timestamptz default now(), last_tested_at timestamptz);
create table if not exists ai_sessions (id uuid primary key default gen_random_uuid(), session_name text not null default 'AI session', provider text not null default 'runpod', model_id text not null, pod_id text, endpoint_url text, status text not null default 'pending', gpu_type text, gpu_count int not null default 8, estimated_hourly_cost numeric, max_hours int not null default 4, started_at timestamptz, stopped_at timestamptz, auto_stop_at timestamptz, created_by uuid, created_at timestamptz default now(), updated_at timestamptz default now());
create table if not exists model_runtimes (id uuid primary key default gen_random_uuid(), session_id uuid references ai_sessions(id) on delete cascade, model_id text not null, serving_engine text not null default 'vllm', status text not null default 'stopped', health_url text, api_base_url text, context_length int default 32768, quantization text default 'fp8', tensor_parallel_size int default 8, pipeline_parallel_size int default 1, last_health_check_at timestamptz, created_at timestamptz default now(), updated_at timestamptz default now());
create table if not exists ai_tasks (id uuid primary key default gen_random_uuid(), title text not null, description text not null, task_type text, priority text default 'normal', status text default 'queued', project_id uuid, repo_id uuid, session_id uuid references ai_sessions(id), allowed_tools text[] default array['chat_only'], risk_level text default 'low', requires_approval boolean default false, input_payload jsonb default '{}'::jsonb, output_summary text, output_payload jsonb, error_message text, created_by uuid, assigned_to_model text, started_at timestamptz, completed_at timestamptz, created_at timestamptz default now(), updated_at timestamptz default now());
create table if not exists ai_task_logs (id uuid primary key default gen_random_uuid(), task_id uuid references ai_tasks(id) on delete cascade, session_id uuid references ai_sessions(id), log_level text default 'info', message text not null, metadata jsonb default '{}'::jsonb, created_at timestamptz default now());
create table if not exists github_repos (id uuid primary key default gen_random_uuid(), provider_credential_id uuid references provider_credentials(id), owner text not null, repo_name text not null, full_name text not null, default_branch text, private boolean default true, connected_at timestamptz default now(), created_at timestamptz default now(), updated_at timestamptz default now());
create table if not exists supabase_projects (id uuid primary key default gen_random_uuid(), provider_credential_id uuid references provider_credentials(id), organization_id text, project_ref text not null, project_name text, region text, status text, db_url_encrypted text, connected_at timestamptz default now(), created_at timestamptz default now(), updated_at timestamptz default now());
create table if not exists approvals (id uuid primary key default gen_random_uuid(), task_id uuid references ai_tasks(id), approval_type text not null, requested_action text not null, risk_level text not null, status text default 'pending', requested_by uuid, approved_by uuid, rejected_by uuid, reason text, created_at timestamptz default now(), resolved_at timestamptz);
create table if not exists audit_logs (id uuid primary key default gen_random_uuid(), actor_type text not null, actor_id uuid, action text not null, target_type text, target_id text, status text not null, metadata jsonb default '{}'::jsonb, created_at timestamptz default now());
create table if not exists cost_events (id uuid primary key default gen_random_uuid(), session_id uuid references ai_sessions(id), provider text default 'runpod', resource_type text, gpu_type text, gpu_count int, estimated_hourly_cost numeric, estimated_total_cost numeric, event_type text not null, created_at timestamptz default now());

create table if not exists model_registry (
  id uuid primary key default gen_random_uuid(),
  model_name text not null,
  model_provider text not null default 'runpod',
  model_family text not null,
  model_role text not null check (model_role in ('business_reasoning','research','architecture','coding','qa','database','devops')),
  model_endpoint_url text,
  serving_engine text not null default 'vllm',
  gpu_provider text not null default 'runpod',
  gpu_profile text not null,
  status text not null default 'not_configured',
  cost_estimate_hourly_usd numeric,
  context_length int not null default 32768,
  enabled boolean not null default true,
  served_model_name text not null,
  priority int not null default 100,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (model_name, model_role, served_model_name)
);

alter table model_runtimes add column if not exists model_registry_id uuid references model_registry(id);
alter table model_runtimes add column if not exists model_role text;
alter table model_runtimes add column if not exists model_provider text default 'runpod';
alter table model_runtimes add column if not exists model_family text;
alter table model_runtimes add column if not exists gpu_provider text default 'runpod';
alter table model_runtimes add column if not exists gpu_profile text;
alter table model_runtimes add column if not exists cost_estimate_hourly_usd numeric;
alter table model_runtimes add column if not exists enabled boolean default true;

alter table ai_sessions add column if not exists model_registry_id uuid references model_registry(id);
alter table ai_sessions add column if not exists model_role text;

alter table ai_tasks add column if not exists model_role text not null default 'auto' check (model_role in ('business_reasoning','research','architecture','coding','qa','database','devops','auto'));
alter table ai_tasks add column if not exists resolved_model_role text;
alter table ai_tasks add column if not exists assigned_model_id text;
alter table ai_tasks add column if not exists assigned_model_name text;

insert into model_registry (model_name, model_provider, model_family, model_role, serving_engine, gpu_provider, gpu_profile, status, cost_estimate_hourly_usd, context_length, enabled, served_model_name, priority)
values
('meta-llama/Meta-Llama-3.1-405B-Instruct','runpod','llama','business_reasoning','vllm','runpod','8xH100-80GB', 'not_configured', 21.52, 32768, true, 'wyndme-llama-405b', 10),
('meta-llama/Meta-Llama-3.1-405B-Instruct','runpod','llama','research','vllm','runpod','8xH100-80GB', 'not_configured', 21.52, 32768, true, 'wyndme-llama-405b', 20),
('meta-llama/Meta-Llama-3.1-405B-Instruct','runpod','llama','architecture','vllm','runpod','8xH100-80GB', 'not_configured', 21.52, 32768, true, 'wyndme-llama-405b', 20),
('Qwen/Qwen3-Coder-480B-A35B-Instruct-FP8','runpod','qwen','coding','vllm','runpod','4xH100-80GB-or-cheaper-compatible', 'not_configured', 10.76, 262144, true, 'wyndme-qwen-coder', 10),
('Qwen/Qwen3-Coder-480B-A35B-Instruct-FP8','runpod','qwen','qa','vllm','runpod','4xH100-80GB-or-cheaper-compatible', 'not_configured', 10.76, 262144, true, 'wyndme-qwen-coder', 20),
('Qwen/Qwen3-Coder-480B-A35B-Instruct-FP8','runpod','qwen','database','vllm','runpod','4xH100-80GB-or-cheaper-compatible', 'not_configured', 10.76, 262144, true, 'wyndme-qwen-coder', 20),
('Qwen/Qwen3-Coder-480B-A35B-Instruct-FP8','runpod','qwen','devops','vllm','runpod','4xH100-80GB-or-cheaper-compatible', 'not_configured', 10.76, 262144, true, 'wyndme-qwen-coder', 20)
on conflict (model_name, model_role, served_model_name) do update set
  model_provider = excluded.model_provider,
  model_family = excluded.model_family,
  serving_engine = excluded.serving_engine,
  gpu_provider = excluded.gpu_provider,
  gpu_profile = excluded.gpu_profile,
  cost_estimate_hourly_usd = excluded.cost_estimate_hourly_usd,
  context_length = excluded.context_length,
  enabled = excluded.enabled,
  priority = excluded.priority,
  updated_at = now();

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

insert into audit_logs(actor_type, action, status, metadata)
values ('system','manual_supabase_setup','ok','{"message":"WyndMe Private AI initialized from manual_setup.sql"}'::jsonb);

commit;
