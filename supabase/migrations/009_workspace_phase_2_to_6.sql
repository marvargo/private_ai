create table if not exists public.project_workspace_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  owner_id uuid not null,
  kind text not null check (kind in ('code_project','workflow','integration')),
  name text not null,
  status text not null default 'draft',
  capability text not null,
  category text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.project_workspace_items enable row level security;

create index if not exists idx_workspace_items_owner_kind on public.project_workspace_items(owner_id, kind, updated_at desc);
create index if not exists idx_workspace_items_project_kind on public.project_workspace_items(project_id, kind, updated_at desc);
create index if not exists idx_workspace_items_capability on public.project_workspace_items(capability, category, updated_at desc);
create index if not exists idx_capability_usage_user_project_time on public.capability_usage_events(user_id, project_id, created_at desc);

do $$ begin
  create policy "workspace items owned select" on public.project_workspace_items for select to authenticated using ((select auth.uid()) = owner_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "workspace items owned insert" on public.project_workspace_items for insert to authenticated with check ((select auth.uid()) = owner_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "workspace items owned update" on public.project_workspace_items for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "workspace items owned delete" on public.project_workspace_items for delete to authenticated using ((select auth.uid()) = owner_id);
exception when duplicate_object then null; end $$;
