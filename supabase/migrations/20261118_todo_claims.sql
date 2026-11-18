-- Agent coordination: a code session claims a task before working on it so parallel sessions never pick the same one.
-- Claim:   update todos set claimed_by = '<lane/session>', claimed_at = now()
--          where code = 'TD-…' and status = 'open' and (claimed_by is null or claimed_at < now() - interval '6 hours') returning code;
--          (no row back = someone else holds it). Release: set claimed_by = null when done or abandoned.
alter table public.todos add column if not exists claimed_by text;
alter table public.todos add column if not exists claimed_at timestamptz;
comment on column public.todos.claimed_by is 'Code session/lane currently working this task (agent coordination). Stale after 6 hours.';
create or replace view public.v_agent_board with (security_invoker = on) as
  select code, title, priority, claimed_by, claimed_at,
         case when claimed_by is not null and claimed_at > now() - interval '6 hours' then 'claimed' else 'free' end as state
  from public.todos where project_id = 2 and status = 'open';
