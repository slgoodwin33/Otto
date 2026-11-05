-- Build .78: move planned money between two categories of one budget week, atomically.
-- Total planned for the week stays the same. security invoker: runs under the caller's RLS
-- (owner-only policies on budget_allocations), so it can't touch anything the owner couldn't.
create or replace function public.move_budget(p_period_code text, p_from_code text, p_to_code text, p_cents bigint)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare v_from bigint; v_to bigint;
begin
  if p_cents is null or p_cents <= 0 then raise exception 'Amount must be more than zero'; end if;
  if p_from_code = p_to_code then raise exception 'Pick two different categories'; end if;
  update budget_allocations ba set planned_cents = ba.planned_cents - p_cents
    from budget_periods bp, transaction_categories tc
   where ba.period_id = bp.id and ba.category_id = tc.id and bp.code = p_period_code and tc.code = p_from_code
     and ba.planned_cents >= p_cents
  returning ba.planned_cents into v_from;
  if not found then raise exception 'Not enough planned in % to move that much', p_from_code; end if;
  update budget_allocations ba set planned_cents = ba.planned_cents + p_cents
    from budget_periods bp, transaction_categories tc
   where ba.period_id = bp.id and ba.category_id = tc.id and bp.code = p_period_code and tc.code = p_to_code
  returning ba.planned_cents into v_to;
  if not found then raise exception 'No % budget line in %', p_to_code, p_period_code; end if;
  return jsonb_build_object('from_planned_cents', v_from, 'to_planned_cents', v_to);
end $$;
revoke all on function public.move_budget(text, text, text, bigint) from public, anon;
grant execute on function public.move_budget(text, text, text, bigint) to authenticated;
