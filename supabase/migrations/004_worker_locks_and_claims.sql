-- Durable worker locks for production task execution.
alter table public.ai_tasks
  add column if not exists locked_at timestamptz,
  add column if not exists locked_by text,
  add column if not exists lock_expires_at timestamptz;

create index if not exists ai_tasks_queued_lock_idx
  on public.ai_tasks (status, lock_expires_at, created_at)
  where status in ('queued', 'running');

create or replace function public.claim_next_ai_task(worker_id text, lock_seconds integer default 300)
returns public.ai_tasks
language plpgsql
security definer
set search_path = public
as $$
declare
  claimed public.ai_tasks;
begin
  update public.ai_tasks
  set status = 'running',
      locked_at = now(),
      locked_by = worker_id,
      lock_expires_at = now() + make_interval(secs => lock_seconds),
      updated_at = now()
  where id = (
    select id
    from public.ai_tasks
    where status = 'queued'
       or (status = 'running' and lock_expires_at is not null and lock_expires_at < now())
    order by priority desc, created_at asc
    for update skip locked
    limit 1
  )
  returning * into claimed;

  return claimed;
end;
$$;
