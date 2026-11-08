import { requireOwner, plaid, json, cors, HttpError, admin, errMessage, errStatus } from "./common.ts";
import { syncItem } from "./sync.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  try {
    await requireOwner(req);
    const body = await req.json();
    if (!body.public_token) throw new HttpError(400, "public_token missing");
    const ex = await plaid("/item/public_token/exchange", { public_token: body.public_token });
    const { data: item, error } = await admin.from("plaid_items").upsert({
      item_id: ex.item_id, access_token: ex.access_token,
      institution_id: body.institution_id ?? null, institution_name: body.institution_name ?? null, status: "good",
    }, { onConflict: "item_id" }).select("id, access_token, sync_cursor, institution_name").single();
    if (error) throw new Error(`plaid_items: ${error.message}`);
    const log = await syncItem(item, "link");
    return json(req, { item_id: ex.item_id, institution: item.institution_name, sync: log });
  } catch (e) {
    return json(req, { error: errMessage(e) }, errStatus(e));
  }
});
