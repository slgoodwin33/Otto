-- TD-00086: the app's Changes list reads what the AI changed. Owner may read chat_actions (writes stay with chat_apply/chat_undo).
-- The owner check is copied from an existing owner policy so the email never appears in this public repo.
do $$
declare q text;
begin
  if exists (select 1 from pg_policy where polrelid = 'public.chat_actions'::regclass and polname = 'chat_actions_owner_read') then return; end if;
  select pg_get_expr(polqual, polrelid) into q from pg_policy where polrelid = 'public.zones'::regclass and polcmd in ('*','r') limit 1;
  if q is null then raise exception 'no owner policy to copy'; end if;
  execute format('create policy chat_actions_owner_read on public.chat_actions for select to authenticated using (%s)', q);
end $$;
