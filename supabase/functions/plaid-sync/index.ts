import { requireOwner, json, cors, admin, errMessage, errStatus, HttpError, plaid } from "./common.ts";
import { syncItem } from "./sync.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  try {
    // Either the signed-in owner (manual pull) or the daily scheduler carrying the key from app_secrets.
    let trigger: "manual" | "schedule" = "manual";
    const sent = req.headers.get("x-sync-key");
    if (sent) {
      const { data: k } = await admin.from("app_secrets").select("value").eq("name", "sync_key").maybeSingle();
      if (!k || k.value !== sent) throw new HttpError(401, "Bad sync key");
      trigger = "schedule";
    } else await requireOwner(req);

    const body = await req.json().catch(() => ({}));
    const { data: items, error } = await admin.from("plaid_items").select("id, access_token, sync_cursor, institution_name").neq("status", "removed");
    if (error) throw new Error(error.message);

    if (body.status) {
      // diagnostics: what Plaid itself knows about each bank connection, and what it holds for the last 7 days
      const end = new Date().toISOString().slice(0, 10), start = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
      const out = [];
      for (const item of items ?? []) {
        const row: Record<string, unknown> = { institution: item.institution_name };
        try {
          const g = await plaid("/item/get", { access_token: item.access_token });
          row.item_error = g.item?.error ?? null;
          row.products = g.item?.products; row.consent_expires = g.item?.consent_expiration_time ?? null;
          row.transactions_status = g.status?.transactions ?? null;
        } catch (e) { row.item_get_error = errMessage(e); }
        try {
          const t = await plaid("/transactions/get", { access_token: item.access_token, start_date: start, end_date: end, options: { count: 100 } });
          row.plaid_last7_count = t.total_transactions;
          row.plaid_latest = t.transactions.map((x: any) => x.date).sort().slice(-1)[0] ?? null;
          row.plaid_pending = t.transactions.filter((x: any) => x.pending).length;
        } catch (e) { row.transactions_get_error = errMessage(e); }
        if (body.refresh) { try { await plaid("/transactions/refresh", { access_token: item.access_token }); row.refresh = "requested"; } catch (e) { row.refresh = errMessage(e); } }
        out.push(row);
      }
      return json(req, { status: out });
    }

    if (body.backfill_locations) {
      // one-off: fill store locations on transactions already saved (sync only sends new/changed ones)
      const end = new Date().toISOString().slice(0, 10), start = new Date(Date.now() - 730 * 86400000).toISOString().slice(0, 10);
      let updated = 0, seen = 0;
      for (const item of items ?? []) {
        for (let offset = 0; offset < 5000; offset += 500) {
          const r = await plaid("/transactions/get", { access_token: item.access_token, start_date: start, end_date: end, options: { count: 500, offset } });
          for (const t of r.transactions) {
            seen++;
            const l = t.location ?? {};
            if (l.lat == null && !l.city && !l.address) continue;
            const { error: e } = await admin.from("transactions").update({ location_lat: l.lat ?? null, location_lon: l.lon ?? null, location_city: l.city ?? null, location_region: l.region ?? null, location_address: l.address ?? null }).eq("plaid_transaction_id", t.transaction_id);
            if (!e) updated++;
          }
          if (offset + 500 >= r.total_transactions) break;
        }
      }
      return json(req, { backfill: true, seen, updated });
    }

    const results = [];
    for (const item of items ?? []) results.push({ institution: item.institution_name, ...(await syncItem(item, trigger)) });
    return json(req, { synced: results.length, results });
  } catch (e) {
    return json(req, { error: errMessage(e) }, errStatus(e));
  }
});
