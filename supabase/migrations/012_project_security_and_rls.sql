create table if not exists public.project_permission_templates (
  id uuid primary key default gen_random_uuid(),
  role text not null,
  permission text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  unique(role, permission)
);

alter table public.project_members add column if not exists granular_permissions jsonb not null default '{}';
alter table public.conversations add column if not exists shared_with_project boolean not null default true;
alter table public.conversations add column if not exists visibility text not null default 'private' check (visibility in ('private','project'));

create table if not exists public.project_tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'todo',
  priority text not null default 'normal',
  created_by uuid,
  owner_id uuid,
  due_at timestamptz,
  completed_at timestamptz,
  initiative_id uuid,
  source_type text,
  source_id text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_task_assignments (
  task_id uuid not null references public.project_tasks(id) on delete cascade,
  user_id uuid not null,
  assigned_by uuid,
  assigned_at timestamptz not null default now(),
  primary key(task_id, user_id)
);

create table if not exists public.project_task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.project_tasks(id) on delete cascade,
  author_id uuid not null,
  encrypted_content text not null,
  key_envelope_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.project_approvals (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  approval_type text not null,
  title text not null,
  description text,
  requested_by uuid,
  assigned_to uuid,
  status text not null default 'pending',
  projected_cost numeric(12,4),
  currency text not null default 'USD',
  payload jsonb not null default '{}',
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid,
  resolution_note text
);

insert into public.project_permission_templates (role, permission, enabled)
select role, permission, enabled
from (values
  ('owner','view_project',true),('owner','edit_project',true),('owner','manage_project',true),('owner','invite_member',true),('owner','remove_member',true),('owner','change_member_role',true),('owner','manage_permissions',true),('owner','create_chat',true),('owner','view_shared_chat',true),('owner','edit_shared_chat',true),('owner','create_studio',true),('owner','create_code',true),('owner','create_workflow',true),('owner','manage_integrations',true),('owner','execute_workflow',true),('owner','approve_requests',true),('owner','view_project_usage',true),('owner','view_project_costs',true),('owner','publish_outputs',true),('owner','manage_knowledge',true),('owner','manage_files',true),('owner','create_task',true),('owner','assign_task',true),('owner','comment',true),('owner','delete_content',true),('owner','delete_project',true),('owner','transfer_ownership',true),
  ('co-admin','view_project',true),('co-admin','edit_project',true),('co-admin','manage_project',true),('co-admin','invite_member',true),('co-admin','remove_member',true),('co-admin','change_member_role',true),('co-admin','manage_permissions',true),('co-admin','create_chat',true),('co-admin','view_shared_chat',true),('co-admin','edit_shared_chat',true),('co-admin','create_studio',true),('co-admin','create_code',true),('co-admin','create_workflow',true),('co-admin','manage_integrations',true),('co-admin','execute_workflow',true),('co-admin','approve_requests',true),('co-admin','view_project_usage',true),('co-admin','view_project_costs',true),('co-admin','publish_outputs',true),('co-admin','manage_knowledge',true),('co-admin','manage_files',true),('co-admin','create_task',true),('co-admin','assign_task',true),('co-admin','comment',true),('co-admin','delete_content',true),('co-admin','delete_project',false),('co-admin','transfer_ownership',false),
  ('collaborator','view_project',true),('collaborator','edit_project',false),('collaborator','manage_project',false),('collaborator','invite_member',false),('collaborator','remove_member',false),('collaborator','change_member_role',false),('collaborator','manage_permissions',false),('collaborator','create_chat',true),('collaborator','view_shared_chat',true),('collaborator','edit_shared_chat',true),('collaborator','create_studio',true),('collaborator','create_code',true),('collaborator','create_workflow',true),('collaborator','manage_integrations',false),('collaborator','execute_workflow',true),('collaborator','approve_requests',false),('collaborator','view_project_usage',true),('collaborator','view_project_costs',false),('collaborator','publish_outputs',true),('collaborator','manage_knowledge',true),('collaborator','manage_files',true),('collaborator','create_task',true),('collaborator','assign_task',true),('collaborator','comment',true),('collaborator','delete_content',false),('collaborator','delete_project',false),('collaborator','transfer_ownership',false),
  ('member','view_project',true),('member','create_chat',true),('member','view_shared_chat',true),('member','edit_shared_chat',false),('member','create_studio',true),('member','create_code',false),('member','create_workflow',false),('member','view_project_usage',true),('member','create_task',true),('member','comment',true),
  ('viewer','view_project',true),('viewer','view_shared_chat',true),('viewer','comment',false)
) as defaults(role, permission, enabled)
on conflict (role, permission) do update set enabled = excluded.enabled;

create or replace function public.is_project_owner(p_project_id uuid, p_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.projects p where p.id = p_project_id and p.owner_id = p_user_id)
    or exists (select 1 from public.project_members m where m.project_id = p_project_id and m.user_id = p_user_id and m.role = 'owner');
$$;

create or replace function public.is_project_member(p_project_id uuid, p_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_project_owner(p_project_id, p_user_id)
    or exists (select 1 from public.project_members m where m.project_id = p_project_id and m.user_id = p_user_id);
$$;

create or replace function public.get_project_role(p_project_id uuid, p_user_id uuid default auth.uid())
returns text language sql stable security definer set search_path = public as $$
  select case when exists (select 1 from public.projects p where p.id = p_project_id and p.owner_id = p_user_id) then 'owner'
    else (select m.role from public.project_members m where m.project_id = p_project_id and m.user_id = p_user_id limit 1) end;
$$;

create or replace function public.has_project_permission(p_project_id uuid, p_permission text, p_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select case
    when public.is_project_owner(p_project_id, p_user_id) then true
    when exists (select 1 from public.project_members m where m.project_id = p_project_id and m.user_id = p_user_id and m.granular_permissions ? p_permission)
      then coalesce((select (m.granular_permissions ->> p_permission)::boolean from public.project_members m where m.project_id = p_project_id and m.user_id = p_user_id limit 1), false)
    when exists (select 1 from public.project_role_permissions prp where prp.project_id = p_project_id and prp.role = public.get_project_role(p_project_id, p_user_id) and prp.permission = p_permission)
      then coalesce((select prp.enabled from public.project_role_permissions prp where prp.project_id = p_project_id and prp.role = public.get_project_role(p_project_id, p_user_id) and prp.permission = p_permission limit 1), false)
    else coalesce((select t.enabled from public.project_permission_templates t where t.role = public.get_project_role(p_project_id, p_user_id) and t.permission = p_permission limit 1), false)
  end;
$$;

create or replace function public.can_access_conversation(p_conversation_id uuid, p_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.conversations c
    where c.id = p_conversation_id and (
      c.created_by = p_user_id or (
        c.project_id is not null and c.shared_with_project = true and c.visibility = 'project' and public.has_project_permission(c.project_id, 'view_shared_chat', p_user_id)
      )
    )
  );
$$;

create or replace function public.can_edit_conversation(p_conversation_id uuid, p_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.conversations c
    where c.id = p_conversation_id and (
      c.created_by = p_user_id or (
        c.project_id is not null and c.shared_with_project = true and c.visibility = 'project' and public.has_project_permission(c.project_id, 'edit_shared_chat', p_user_id)
      )
    )
  );
$$;

do $$
declare table_name text;
begin
  foreach table_name in array array['projects','project_members','project_invitations','project_role_permissions','project_permission_templates','project_activity_events','project_initiatives','project_tasks','project_task_assignments','project_task_comments','project_approvals','project_dashboard_preferences','project_favorites','project_content_links','project_notifications','project_workspace_items','project_assets','conversations','conversation_messages','capability_usage_events'] loop
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end $$;

drop policy if exists "projects member select" on public.projects;
create policy "projects member select" on public.projects for select to authenticated using (public.is_project_member(id, (select auth.uid())));
drop policy if exists "projects permitted update" on public.projects;
create policy "projects permitted update" on public.projects for update to authenticated using (public.has_project_permission(id, 'edit_project', (select auth.uid()))) with check (public.has_project_permission(id, 'edit_project', (select auth.uid())));
drop policy if exists "projects owner delete" on public.projects;
create policy "projects owner delete" on public.projects for delete to authenticated using (public.is_project_owner(id, (select auth.uid())));
drop policy if exists "projects owner insert" on public.projects;
create policy "projects owner insert" on public.projects for insert to authenticated with check (owner_id = (select auth.uid()));

drop policy if exists "members project select" on public.project_members;
create policy "members project select" on public.project_members for select to authenticated using (public.is_project_member(project_id, (select auth.uid())));
drop policy if exists "members manage insert" on public.project_members;
create policy "members manage insert" on public.project_members for insert to authenticated with check (public.has_project_permission(project_id, 'invite_member', (select auth.uid())) or public.has_project_permission(project_id, 'change_member_role', (select auth.uid())));
drop policy if exists "members manage update" on public.project_members;
create policy "members manage update" on public.project_members for update to authenticated using (public.has_project_permission(project_id, 'change_member_role', (select auth.uid()))) with check (public.has_project_permission(project_id, 'change_member_role', (select auth.uid())));
drop policy if exists "members manage delete" on public.project_members;
create policy "members manage delete" on public.project_members for delete to authenticated using (public.has_project_permission(project_id, 'remove_member', (select auth.uid())));

drop policy if exists "invitations member select" on public.project_invitations;
create policy "invitations member select" on public.project_invitations for select to authenticated using (public.is_project_member(project_id, (select auth.uid())));
drop policy if exists "invitations invite insert" on public.project_invitations;
create policy "invitations invite insert" on public.project_invitations for insert to authenticated with check (public.has_project_permission(project_id, 'invite_member', (select auth.uid())));
drop policy if exists "invitations invite update" on public.project_invitations;
create policy "invitations invite update" on public.project_invitations for update to authenticated using (public.has_project_permission(project_id, 'invite_member', (select auth.uid()))) with check (public.has_project_permission(project_id, 'invite_member', (select auth.uid())));

drop policy if exists "role permissions member select" on public.project_role_permissions;
create policy "role permissions member select" on public.project_role_permissions for select to authenticated using (project_id is null or public.is_project_member(project_id, (select auth.uid())));
drop policy if exists "role permissions manage" on public.project_role_permissions;
create policy "role permissions manage" on public.project_role_permissions for all to authenticated using (project_id is not null and public.has_project_permission(project_id, 'manage_permissions', (select auth.uid()))) with check (project_id is not null and public.has_project_permission(project_id, 'manage_permissions', (select auth.uid())));
drop policy if exists "templates authenticated select" on public.project_permission_templates;
create policy "templates authenticated select" on public.project_permission_templates for select to authenticated using (true);

drop policy if exists "activity member select" on public.project_activity_events;
create policy "activity member select" on public.project_activity_events for select to authenticated using (visibility = 'project' and public.is_project_member(project_id, (select auth.uid())));
drop policy if exists "activity member insert" on public.project_activity_events;
create policy "activity member insert" on public.project_activity_events for insert to authenticated with check (public.is_project_member(project_id, (select auth.uid())));

drop policy if exists "initiatives member select" on public.project_initiatives;
create policy "initiatives member select" on public.project_initiatives for select to authenticated using (public.is_project_member(project_id, (select auth.uid())));
drop policy if exists "initiatives manage write" on public.project_initiatives;
create policy "initiatives manage write" on public.project_initiatives for all to authenticated using (public.has_project_permission(project_id, 'create_task', (select auth.uid()))) with check (public.has_project_permission(project_id, 'create_task', (select auth.uid())));

drop policy if exists "tasks member select" on public.project_tasks;
create policy "tasks member select" on public.project_tasks for select to authenticated using (public.is_project_member(project_id, (select auth.uid())));
drop policy if exists "tasks create insert" on public.project_tasks;
create policy "tasks create insert" on public.project_tasks for insert to authenticated with check (public.has_project_permission(project_id, 'create_task', (select auth.uid())));
drop policy if exists "tasks assign update" on public.project_tasks;
create policy "tasks assign update" on public.project_tasks for update to authenticated using (public.has_project_permission(project_id, 'assign_task', (select auth.uid())) or owner_id = (select auth.uid()) or created_by = (select auth.uid())) with check (public.has_project_permission(project_id, 'assign_task', (select auth.uid())) or owner_id = (select auth.uid()) or created_by = (select auth.uid()));

drop policy if exists "task assignments member select" on public.project_task_assignments;
create policy "task assignments member select" on public.project_task_assignments for select to authenticated using (exists (select 1 from public.project_tasks t where t.id = task_id and public.is_project_member(t.project_id, (select auth.uid()))));
drop policy if exists "task assignments assign write" on public.project_task_assignments;
create policy "task assignments assign write" on public.project_task_assignments for all to authenticated using (exists (select 1 from public.project_tasks t where t.id = task_id and public.has_project_permission(t.project_id, 'assign_task', (select auth.uid())))) with check (exists (select 1 from public.project_tasks t where t.id = task_id and public.has_project_permission(t.project_id, 'assign_task', (select auth.uid()))));

drop policy if exists "task comments member select" on public.project_task_comments;
create policy "task comments member select" on public.project_task_comments for select to authenticated using (exists (select 1 from public.project_tasks t where t.id = task_id and public.is_project_member(t.project_id, (select auth.uid()))));
drop policy if exists "task comments comment insert" on public.project_task_comments;
create policy "task comments comment insert" on public.project_task_comments for insert to authenticated with check (author_id = (select auth.uid()) and exists (select 1 from public.project_tasks t where t.id = task_id and public.has_project_permission(t.project_id, 'comment', (select auth.uid()))));

drop policy if exists "approvals member select" on public.project_approvals;
create policy "approvals member select" on public.project_approvals for select to authenticated using (public.has_project_permission(project_id, 'approve_requests', (select auth.uid())) or requested_by = (select auth.uid()) or assigned_to = (select auth.uid()));
drop policy if exists "approvals member insert" on public.project_approvals;
create policy "approvals member insert" on public.project_approvals for insert to authenticated with check (public.is_project_member(project_id, (select auth.uid())));
drop policy if exists "approvals resolver update" on public.project_approvals;
create policy "approvals resolver update" on public.project_approvals for update to authenticated using (public.has_project_permission(project_id, 'approve_requests', (select auth.uid()))) with check (public.has_project_permission(project_id, 'approve_requests', (select auth.uid())));

drop policy if exists "dashboard preferences owner" on public.project_dashboard_preferences;
create policy "dashboard preferences owner" on public.project_dashboard_preferences for all to authenticated using (user_id = (select auth.uid()) and public.is_project_member(project_id, (select auth.uid()))) with check (user_id = (select auth.uid()) and public.is_project_member(project_id, (select auth.uid())));
drop policy if exists "favorites owner" on public.project_favorites;
create policy "favorites owner" on public.project_favorites for all to authenticated using (user_id = (select auth.uid()) and public.is_project_member(project_id, (select auth.uid()))) with check (user_id = (select auth.uid()) and public.is_project_member(project_id, (select auth.uid())));
drop policy if exists "content links member select" on public.project_content_links;
create policy "content links member select" on public.project_content_links for select to authenticated using (public.is_project_member(project_id, (select auth.uid())));
drop policy if exists "notifications owner select" on public.project_notifications;
create policy "notifications owner select" on public.project_notifications for select to authenticated using (user_id = (select auth.uid()) or (user_id is null and public.is_project_member(project_id, (select auth.uid()))));
drop policy if exists "workspace project select" on public.project_workspace_items;
create policy "workspace project select" on public.project_workspace_items for select to authenticated using ((project_id is null and owner_id = (select auth.uid())) or (project_id is not null and public.is_project_member(project_id, (select auth.uid()))));
drop policy if exists "assets project select" on public.project_assets;
create policy "assets project select" on public.project_assets for select to authenticated using (public.is_project_member(project_id, (select auth.uid())));
drop policy if exists "conversations scoped select" on public.conversations;
create policy "conversations scoped select" on public.conversations for select to authenticated using (public.can_access_conversation(id, (select auth.uid())));
drop policy if exists "conversations scoped update" on public.conversations;
create policy "conversations scoped update" on public.conversations for update to authenticated using (public.can_edit_conversation(id, (select auth.uid()))) with check (public.can_edit_conversation(id, (select auth.uid())));
drop policy if exists "conversation messages scoped select" on public.conversation_messages;
create policy "conversation messages scoped select" on public.conversation_messages for select to authenticated using (public.can_access_conversation(conversation_id, (select auth.uid())));
drop policy if exists "conversation messages scoped insert" on public.conversation_messages;
create policy "conversation messages scoped insert" on public.conversation_messages for insert to authenticated with check (public.can_edit_conversation(conversation_id, (select auth.uid())));
drop policy if exists "capability usage aggregate select" on public.capability_usage_events;
create policy "capability usage aggregate select" on public.capability_usage_events for select to authenticated using ((user_id = (select auth.uid())) or (project_id is not null and public.has_project_permission(project_id, 'view_project_usage', (select auth.uid()))));
