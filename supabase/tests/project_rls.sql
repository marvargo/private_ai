-- pgTAP-style project RLS assertions for local Supabase validation.
-- Run with a local Supabase test harness after applying migrations through 012.

begin;
select plan(9);
select has_function('public', 'is_project_owner', array['uuid','uuid'], 'is_project_owner helper exists');
select has_function('public', 'is_project_member', array['uuid','uuid'], 'is_project_member helper exists');
select has_function('public', 'has_project_permission', array['uuid','text','uuid'], 'has_project_permission helper exists');
select policies_are('public', 'projects', array['projects member select','projects permitted update','projects owner delete','projects owner insert'], 'projects has owner/member policies');
select policies_are('public', 'conversations', array['conversations scoped select','conversations scoped update'], 'conversations has scoped policies');
select policies_are('public', 'conversation_messages', array['conversation messages scoped select','conversation messages scoped insert'], 'messages inherit conversation access');
select results_eq($$ select public.has_project_permission('00000000-0000-0000-0000-000000000000'::uuid, 'view_project', '00000000-0000-0000-0000-000000000001'::uuid) $$, $$ values(false) $$, 'stranger denied when no membership exists');
select results_eq($$ select public.can_access_conversation('00000000-0000-0000-0000-000000000000'::uuid, '00000000-0000-0000-0000-000000000001'::uuid) $$, $$ values(false) $$, 'standalone or missing conversation is excluded');
select isnt_empty($$ select 1 from public.project_permission_templates where role = 'viewer' and permission = 'view_project' and enabled = true $$, 'viewer read-only default is seeded');
select * from finish();
rollback;
