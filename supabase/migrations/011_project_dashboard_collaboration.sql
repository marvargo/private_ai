alter table public.projects add column if not exists project_type text not null default 'workspace';
alter table public.projects add column if not exists description text;
alter table public.projects add column if not exists status text not null default 'active';
alter table public.projects add column if not exists cover_color text not null default '#0f172a';
alter table public.projects add column if not exists pinned_at timestamptz;

create table if not exists public.project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null,
  display_name text not null default 'Project member',
  avatar_url text,
  role text not null check (role in ('owner','co-admin','collaborator','member','viewer')),
  granular_permissions jsonb not null default '{}',
  last_activity_at timestamptz,
  created_at timestamptz not null default now(),
  unique(project_id, user_id)
);

create table if not exists public.project_invitations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  email text not null,
  role text not null check (role in ('co-admin','collaborator','member','viewer')),
  invited_by uuid not null,
  invitation_message text,
  status text not null default 'pending' check (status in ('pending','accepted','revoked','expired')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  revoked_at timestamptz
);

create table if not exists public.project_role_permissions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  role text not null,
  permission text not null,
  enabled boolean not null default true,
  unique(project_id, role, permission)
);

create table if not exists public.project_activity_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  actor_id uuid,
  actor_name text not null,
  actor_type text not null check (actor_type in ('user','ai','workflow','integration','system')),
  action text not null,
  target_title text not null,
  project_section text not null,
  status text not null default 'ok',
  visibility text not null default 'project' check (visibility in ('project','restricted')),
  link text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.project_initiatives (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  description text,
  owner_id uuid,
  owner_name text not null default 'Project owner',
  status text not null default 'in_progress' check (status in ('not_started','in_progress','blocked','completed')),
  progress integer not null default 0 check (progress between 0 and 100),
  target_date date,
  contributors jsonb not null default '[]',
  dependencies jsonb not null default '[]',
  blockers jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_dashboard_preferences (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null,
  preferences jsonb not null default '{}',
  updated_at timestamptz not null default now(),
  primary key(project_id, user_id)
);

create table if not exists public.project_favorites (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null,
  created_at timestamptz not null default now(),
  primary key(project_id, user_id)
);

create table if not exists public.project_content_links (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  content_type text not null,
  content_id text not null,
  shared boolean not null default true,
  permissions jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.project_notifications (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid,
  title text not null,
  notification_type text not null,
  status text not null default 'unread',
  created_at timestamptz not null default now()
);

alter table public.project_members enable row level security;
alter table public.project_invitations enable row level security;
alter table public.project_role_permissions enable row level security;
alter table public.project_activity_events enable row level security;
alter table public.project_initiatives enable row level security;
alter table public.project_dashboard_preferences enable row level security;
alter table public.project_favorites enable row level security;
alter table public.project_content_links enable row level security;
alter table public.project_notifications enable row level security;

create index if not exists idx_project_members_user on public.project_members(user_id, project_id);
create index if not exists idx_project_invitations_email_status on public.project_invitations(email, status, expires_at);
create index if not exists idx_project_activity_project_time on public.project_activity_events(project_id, created_at desc);
create index if not exists idx_project_initiatives_project_status on public.project_initiatives(project_id, status, updated_at desc);
create index if not exists idx_project_content_links_project_type on public.project_content_links(project_id, content_type, created_at desc);
