create table model_registry (
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
  updated_at timestamptz default now()
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
('Qwen/Qwen3-Coder-480B-A35B-Instruct-FP8','runpod','qwen','devops','vllm','runpod','4xH100-80GB-or-cheaper-compatible', 'not_configured', 10.76, 262144, true, 'wyndme-qwen-coder', 20);

alter table model_registry enable row level security;
