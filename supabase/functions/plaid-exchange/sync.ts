import { admin, plaid, nextCode, errMessage } from "./common.ts";

type PlaidAccount = { account_id: string; name: string; official_name?: string; mask?: string; type: string; subtype?: string; balances: { current?: number; available?: number; limit?: number } };
type PlaidTx = { transaction_id: string; account_id: string; amount: number; date: string; authorized_date?: string; name: string; merchant_name?: string; pending: boolean; pending_transaction_id?: string; payment_channel?: string; personal_finance_category?: { primary: string; detailed: string } };

const cents = (n: number | undefined | null) => n == null ? null : Math.round(n * 100);
const today = () => new Date().toISOString().slice(0, 10);

function accountType(a: PlaidAccount): string {
  if (a.type === "credit") return "credit card";
  if (a.type === "depository") return a.subtype && ["checking", "savings"].includes(a.subtype) ? a.subtype : "depository";
  return a.type;
}

/** Make sure every Plaid account has a row in `accounts`; returns plaid_account_id -> accounts.id. */
async function upsertAccounts(itemRowId: number, institution: string | null, accounts: PlaidAccount[]): Promise<Record<string, number>> {
  const map: Record<string, number> = {};
  for (const a of accounts) {
    const balance = { current_balance_cents: cents(a.balances.current), available_balance_cents: cents(a.balances.available), credit_limit_cents: cents(a.balances.limit), balance_updated_at: new Date().toISOString(), mask: a.mask ?? null, subtype: a.subtype ?? null, plaid_item_id: itemRowId };
    let { data: existing } = await admin.from("accounts").select("id").eq("plaid_account_id", a.account_id).maybeSingle();
    if (!existing && a.mask) {
      // first link: adopt the hand-entered account whose name carries the same last-4 (e.g. "Checking (debit ...4008)")
      const { data: byMask } = await admin.from("accounts").select("id").is("plaid_account_id", null).ilike("name", `%${a.mask}%`).limit(1);
      if (byMask && byMask.length) existing = byMask[0];
    }
    if (existing) {
      await admin.from("accounts").update({ ...balance, plaid_account_id: a.account_id }).eq("id", existing.id);
      map[a.account_id] = existing.id;
    } else {
      const code = await nextCode("accounts", "AC");
      const { data: created, error } = await admin.from("accounts").insert({ code, name: `${a.name}${a.mask ? ` (...${a.mask})` : ""}`, account_type: accountType(a), institution, plaid_account_id: a.account_id, ...balance }).select("id").single();
      if (error) throw new Error(`accounts insert: ${error.message}`);
      map[a.account_id] = created.id;
    }
    // one balance snapshot per account per day
    const { data: snap } = await admin.from("balance_snapshots").select("id").eq("account_id", map[a.account_id]).eq("captured_on", today()).maybeSingle();
    if (snap) await admin.from("balance_snapshots").update({ balance_cents: cents(a.balances.current) ?? 0 }).eq("id", snap.id);
    else await admin.from("balance_snapshots").insert({ code: await nextCode("balance_snapshots", "BS"), account_id: map[a.account_id], captured_on: today(), balance_cents: cents(a.balances.current) ?? 0 });
  }
  return map;
}

async function loadCategoryMap() {
  const { data } = await admin.from("plaid_category_map").select("plaid_category, category_id, exclude_from_budget");
  const m = new Map<string, { category_id: number | null; exclude: boolean }>();
  for (const r of data ?? []) m.set(r.plaid_category, { category_id: r.category_id, exclude: r.exclude_from_budget });
  return m;
}

async function loadRules() {
  const { data } = await admin.from("category_rules").select("match_text, category_id, exclude_from_budget").order("id");
  return (data ?? []).map((r) => ({ text: String(r.match_text).toLowerCase(), category_id: r.category_id as number | null, exclude: !!r.exclude_from_budget }));
}

export async function syncItem(item: { id: number; access_token: string; sync_cursor: string | null; institution_name: string | null }, trigger: "link" | "manual" | "schedule") {
  const log = { plaid_item_id: item.id, trigger, added: 0, modified: 0, removed: 0, ok: true, error: null as string | null };
  try {
    let cursor = item.sync_cursor ?? "";
    const added: PlaidTx[] = [], modified: PlaidTx[] = [], removed: { transaction_id: string }[] = [];
    let accounts: PlaidAccount[] = [];
    for (let guard = 0; guard < 50; guard++) {
      const r = await plaid("/transactions/sync", { access_token: item.access_token, cursor: cursor || undefined, count: 500 });
      added.push(...r.added); modified.push(...r.modified); removed.push(...r.removed);
      if (r.accounts) accounts = r.accounts;
      cursor = r.next_cursor;
      if (!r.has_more) break;
    }
    if (!accounts.length) accounts = (await plaid("/accounts/get", { access_token: item.access_token })).accounts;
    const acctIds = await upsertAccounts(item.id, item.institution_name, accounts);
    const catMap = await loadCategoryMap();
    const rules = await loadRules();

    const mapCategory = (t: PlaidTx) => {
      // your own rules win over Plaid's labels
      const hay = `${t.merchant_name ?? ""} ${t.name ?? ""}`.toLowerCase();
      const rule = rules.find((r) => hay.includes(r.text));
      if (rule) return { category_id: rule.category_id, exclude_from_budget: rule.exclude };
      const det = t.personal_finance_category?.detailed, pri = t.personal_finance_category?.primary;
      const hit = (det && catMap.get(det)) || (pri && catMap.get(pri)) || null;
      return { category_id: hit?.category_id ?? null, exclude_from_budget: hit?.exclude ?? false };
    };
    const rowFor = (t: PlaidTx) => ({
      account_id: acctIds[t.account_id], transaction_date: t.date, authorized_date: t.authorized_date ?? null,
      description: t.name, merchant: t.merchant_name ?? null, amount_cents: -Math.round(t.amount * 100), pending: t.pending,
      source: "plaid", plaid_transaction_id: t.transaction_id, plaid_pending_transaction_id: t.pending_transaction_id ?? null,
      plaid_category_primary: t.personal_finance_category?.primary ?? null, plaid_category_detailed: t.personal_finance_category?.detailed ?? null,
      payment_channel: t.payment_channel ?? null,
    });

    for (const t of added) {
      if (!acctIds[t.account_id]) continue;
      const { data: dup } = await admin.from("transactions").select("id").eq("plaid_transaction_id", t.transaction_id).maybeSingle();
      if (dup) { await admin.from("transactions").update(rowFor(t)).eq("id", dup.id); log.modified++; continue; }
      let cat = mapCategory(t);
      if (t.pending_transaction_id) {
        // posted version of an earlier pending row: carry your category over, retire the pending row
        const { data: prev } = await admin.from("transactions").select("id, category_id, exclude_from_budget").eq("plaid_transaction_id", t.pending_transaction_id).maybeSingle();
        if (prev) { if (prev.category_id != null) cat = { category_id: prev.category_id, exclude_from_budget: prev.exclude_from_budget }; await admin.from("transactions").update({ removed_at: new Date().toISOString() }).eq("id", prev.id); }
      }
      const { error } = await admin.from("transactions").insert({ ...rowFor(t), ...cat });
      if (error) throw new Error(`transactions insert: ${error.message}`);
      log.added++;
    }
    for (const t of modified) {
      if (!acctIds[t.account_id]) continue;
      // keep your category and exclusion as they are; refresh everything Plaid owns
      const { error } = await admin.from("transactions").update(rowFor(t)).eq("plaid_transaction_id", t.transaction_id);
      if (error) throw new Error(`transactions update: ${error.message}`);
      log.modified++;
    }
    for (const r of removed) {
      await admin.from("transactions").update({ removed_at: new Date().toISOString() }).eq("plaid_transaction_id", r.transaction_id).is("removed_at", null);
      log.removed++;
    }
    await admin.from("plaid_items").update({ sync_cursor: cursor, last_synced_at: new Date().toISOString(), status: "good", last_error: null }).eq("id", item.id);
  } catch (e) {
    log.ok = false; log.error = errMessage(e);
    const loginNeeded = /ITEM_LOGIN_REQUIRED|PENDING_EXPIRATION/.test(log.error);
    await admin.from("plaid_items").update({ status: loginNeeded ? "login_required" : "error", last_error: log.error }).eq("id", item.id);
  }
  await admin.from("plaid_sync_log").insert(log);
  return log;
}
