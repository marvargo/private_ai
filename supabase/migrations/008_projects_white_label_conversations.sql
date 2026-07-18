create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  name text not null,
  description text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.conversations add column if not exists project_id uuid references public.projects(id) on delete cascade;
alter table public.conversations add column if not exists archived_at timestamptz;
alter table public.conversations add column if not exists pinned_at timestamptz;
alter table public.conversations add column if not exists folder text;
alter table public.conversations add column if not exists settings jsonb not null default '{}';
alter table public.conversation_messages add column if not exists encrypted_content text;
alter table public.conversation_messages alter column content drop not null;

create table if not exists public.project_assets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  owner_id uuid not null,
  capability text not null,
  asset_type text not null,
  storage_path text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.capability_usage_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete set null,
  conversation_id uuid references public.conversations(id) on delete set null,
  user_id uuid,
  tenant_id uuid,
  capability text not null,
  category text not null default 'general',
  duration_ms integer,
  latency_ms integer,
  input_tokens integer,
  output_tokens integer,
  total_tokens integer,
  estimated_cost numeric(10,4),
  actual_cost numeric(10,4),
  success boolean not null default true,
  failure_code text,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'
);

create table if not exists public.routing_policies (
  id uuid primary key default gen_random_uuid(),
  capability text not null,
  category text,
  task_type text,
  runtime_pool_id text references public.runtime_pools(id),
  priority_order integer not null default 100,
  enabled boolean not null default true,
  conditions jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.routing_policies (capability, category, task_type, runtime_pool_id, priority_order, conditions) values
  ('chat','business','business_strategy','llama-thinking',10,'{}'),
  ('chat','programming','app_development','qwen-coding',20,'{}'),
  ('coding','programming','app_development','qwen-coding',10,'{}'),
  ('studio','image','image_generation',null,100,'{"future_pool":"image-generation"}'),
  ('studio','video','video_generation',null,110,'{"future_pool":"video-generation"}')
on conflict do nothing;

create index if not exists idx_projects_owner_active on public.projects(owner_id, archived_at, updated_at desc);
create index if not exists idx_conversations_project_owner on public.conversations(project_id, created_by, updated_at desc);
create index if not exists idx_conversation_messages_conversation_created on public.conversation_messages(conversation_id, created_at);
create index if not exists idx_project_assets_project_type on public.project_assets(project_id, asset_type, created_at desc);
create index if not exists idx_capability_usage_project_time on public.capability_usage_events(project_id, created_at desc);
create index if not exists idx_capability_usage_capability_category on public.capability_usage_events(capability, category, created_at desc);
create index if not exists idx_routing_policies_lookup on public.routing_policies(capability, category, task_type, enabled, priority_order);

alter table public.projects enable row level security;
alter table public.project_assets enable row level security;
alter table public.capability_usage_events enable row level security;
alter table public.routing_policies enable row level security;
