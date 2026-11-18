-- TD-00099 / TD-00100 / TD-00102 (Supabase advisor, Nov 13).
-- 1) v_bank_connections ran with its owner's rights (SECURITY DEFINER view). Make it run as the caller, and let the
--    owner read only the non-secret columns of plaid_items (never access_token or sync_cursor).
grant select (id, item_id, institution_name, status, last_error, last_synced_at, created_at) on public.plaid_items to authenticated;
create policy plaid_items_owner_read on public.plaid_items for select to authenticated
  using (lower(coalesce((select auth.jwt()) ->> 'email', '')) = 'slgoodwin33@gmail.com');
alter view public.v_bank_connections set (security_invoker = on);
-- 2) Trigger functions were callable by anon/authenticated over /rpc. Triggers don't need EXECUTE at fire time.
revoke execute on function public.consume_stock_for_meal() from public, anon, authenticated;
revoke execute on function public.sync_card_bill_amount() from public, anon, authenticated;
revoke execute on function public.projects_one_level_nesting() from public, anon, authenticated;
-- 3) Fixed search_path on the remaining trigger function.
alter function public.projects_one_level_nesting() set search_path = public;
