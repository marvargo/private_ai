create table if not exists public.production_validation_events (
  id uuid primary key default gen_random_uuid(),
  gate_id text not null,
  status text not null check (status in ('pending','passed','failed','blocked')),
  evidence text,
  blocker text,
  actor_id uuid,
  created_at timestamptz not null default now()
);

alter table public.production_validation_events enable row level security;
create index if not exists idx_production_validation_gate_time on public.production_validation_events(gate_id, created_at desc);
