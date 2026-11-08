import { requireOwner, plaid, json, cors, HttpError, admin, errMessage, errStatus } from "./common.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  try {
    const user = await requireOwner(req);
    const body = await req.json().catch(() => ({}));
    const payload: Record<string, unknown> = {
      user: { client_user_id: user.id }, client_name: "Otto", language: "en", country_codes: ["US"],
    };
    if (body.item_id) {
      // update mode: re-authenticate an existing connection
      const { data: item } = await admin.from("plaid_items").select("access_token").eq("item_id", body.item_id).single();
      if (!item) throw new HttpError(404, "Unknown connection");
      payload.access_token = item.access_token;
    } else {
      payload.products = ["transactions"];
      payload.transactions = { days_requested: 90 };
    }
    // OAuth banks (e.g. Discover) send you back here. Must also be listed under Allowed redirect URIs in Plaid.
    const redirect = Deno.env.get("PLAID_REDIRECT_URI");
    if (redirect) payload.redirect_uri = redirect;
    const r = await plaid("/link/token/create", payload);
    return json(req, { link_token: r.link_token, expiration: r.expiration });
  } catch (e) {
    return json(req, { error: errMessage(e) }, errStatus(e));
  }
});
