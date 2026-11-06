// otto-tools: outside-world helpers for the app. Owner sign-in required.
//  vin      → NHTSA vPIC decode (year, make, model, trim, engine…)
//  recalls  → NHTSA recalls for make/model/year
//  listing  → read an apartment listing page (rent, beds, baths, address)
//  clothing → identify a garment photo: specific type (from table clothing_types), color, brand, material, fit, sleeve, neckline, pattern, care, formality, seasons, condition guess
//  clothing_lookup → find the exact product online: product page, stock photo (copied into our private storage), retail price, worth now (resale)
import { requireOwner, json, cors, admin, errMessage, errStatus, HttpError } from "./common.ts";
const MODEL = Deno.env.get("OTTO_MODEL") ?? "claude-sonnet-5-5";

async function claudeTool(content: any[], tool: any) {
  const key = Deno.env.get("ANTHROPIC_API_KEY"); if (!key) throw new HttpError(503, "ANTHROPIC_API_KEY is not set");
  const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: MODEL, max_tokens: 1500, tools: [tool], tool_choice: { type: "tool", name: tool.name }, messages: [{ role: "user", content }] }) });
  const out = await r.json(); if (!r.ok) throw new HttpError(502, `AI request failed: ${out?.error?.message ?? r.status}`);
  const tu = (out.content ?? []).find((c: any) => c.type === "tool_use"); if (!tu) throw new HttpError(502, "No answer"); return tu.input ?? {};
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  try {
    await requireOwner(req);
    const b = await req.json().catch(() => ({}));
    if (b.action === "vin") {
      const vin = String(b.vin ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) throw new HttpError(400, "A VIN is 17 letters and digits (no I, O or Q)");
      const r = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValuesExtended/${vin}?format=json`);
      const v = (await r.json())?.Results?.[0] ?? {};
      const pick = (k: string) => (v[k] && v[k] !== "Not Applicable") ? String(v[k]) : null;
      return json(req, { vin, year: pick("ModelYear"), make: pick("Make"), model: pick("Model"), trim: pick("Trim"), series: pick("Series"),
        engine: [pick("DisplacementL") && `${Number(pick("DisplacementL")).toFixed(1)} L`, pick("EngineCylinders") && `${pick("EngineCylinders")} cyl`, pick("FuelTypePrimary")].filter(Boolean).join(" · ") || null,
        transmission: pick("TransmissionStyle"), drive: pick("DriveType"), body: pick("BodyClass"), plant: pick("PlantCity"), error: v.ErrorCode && v.ErrorCode !== "0" ? pick("ErrorText") : null });
    }
    if (b.action === "recalls") {
      const u = `https://api.nhtsa.gov/recalls/recallsByVehicle?make=${encodeURIComponent(b.make)}&model=${encodeURIComponent(b.model)}&modelYear=${encodeURIComponent(b.year)}`;
      const d = await (await fetch(u)).json();
      return json(req, { count: d.Count ?? 0, recalls: (d.results ?? []).map((x: any) => ({ campaign: x.NHTSACampaignNumber, date: x.ReportReceivedDate, component: x.Component, summary: x.Summary, remedy: x.Remedy })) });
    }
    if (b.action === "listing") {
      let url: URL; try { url = new URL(String(b.url)); } catch { throw new HttpError(400, "That doesn't look like a link"); }
      if (!/^https?:$/.test(url.protocol)) throw new HttpError(400, "Only web links");
      const r = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148", "accept-language": "en-US" }, redirect: "follow" });
      if (!r.ok) return json(req, { blocked: true, status: r.status, source: url.hostname });
      const html = await r.text();
      const text = html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 40000);
      const meta = (html.match(/<meta[^>]+(property|name)="(og:title|og:description|description)"[^>]*>/gi) ?? []).join("\n").slice(0, 3000);
      const f = await claudeTool([{ type: "text", text: `Apartment listing page from ${url.hostname}.\nMETA:\n${meta}\nTEXT:\n${text}` }], {
        name: "listing", description: "Fields read from the listing. Leave a field empty if it isn't on the page.", input_schema: { type: "object", properties: {
          title: { type: "string" }, address: { type: "string" }, rent_dollars: { type: "number" }, beds: { type: "number" }, baths: { type: "number" }, sqft: { type: "number" },
          available_on: { type: "string", description: "YYYY-MM-DD" }, pros: { type: "string", description: "short: laundry, parking, pets…" } }, required: ["title"] } });
      return json(req, { ...f, rent_cents: f.rent_dollars ? Math.round(Number(f.rent_dollars) * 100) : null, source: url.hostname, url: url.toString() });
    }
    if (b.action === "clothing") {
      if (!b.data) throw new HttpError(400, "Send a photo");
      const { data: types } = await admin.from("clothing_types").select("code, label").order("sort");
      const codes = (types ?? []).map((t: any) => t.code);
      const f = await claudeTool([{ type: "image", source: { type: "base64", media_type: String(b.media_type || "image/jpeg"), data: String(b.data) } },
        { type: "text", text: "Identify this clothing item for a closet app." }], {
        name: "garment", description: "The garment in the photo.", input_schema: { type: "object", properties: {
          name: { type: "string", description: "short, e.g. 'Navy quarter-zip', 'Gray chinos'" },
          type_code: { type: "string", enum: codes, description: "the most specific type: " + (types ?? []).map((t: any) => `${t.code}=${t.label}`).join(", ") },
          fit: { type: "string", enum: ["slim", "regular", "relaxed", "oversized"] }, sleeve_length: { type: "string", enum: ["sleeveless", "short", "three_quarter", "long"] },
          neckline: { type: "string", enum: ["crew", "v_neck", "collared", "button_down_collar", "hooded", "mock", "henley", "quarter_zip", "full_zip", "scoop", "other"] },
          pattern: { type: "string", enum: ["solid", "graphic", "logo", "striped", "plaid", "check", "camo", "floral", "colorblock", "heathered", "print", "other"] },
          secondary_color: { type: "string" }, care: { type: "string", description: "from the care tag if visible, else typical for the fabric, e.g. 'Machine wash cold, tumble dry low'" },
          formality: { type: "string", enum: ["athletic", "casual", "smart_casual", "business", "formal"] },
          seasons: { type: "array", items: { type: "string", enum: ["spring", "summer", "fall", "winter"] } },
          color: { type: "string" }, brand: { type: "string" }, season: { type: "string", enum: ["all", "warm", "cold", "spring/fall"] },
          warmth: { type: "integer", minimum: 1, maximum: 5, description: "1 = very light, 5 = heavy winter" }, wears_before_wash: { type: "integer", minimum: 1, maximum: 10, description: "typical: tees/underlayers 1, shirts 1-2, jeans 4-6, sweaters 3-5, outerwear 10" },
          material: { type: "string", description: "e.g. cotton, cotton/poly fleece, wool, denim, leather; empty if unsure" },
          condition: { type: "string", enum: ["new", "like_new", "good", "fair", "worn"], description: "from visible wear, pilling, fading, tags" },
          style_hint: { type: "string", description: "anything printed or visible that identifies the exact product: logo text, graphic, tag, model name" } },
          required: ["name", "type_code"] } });
      return json(req, f);
    }

    if (b.action === "clothing_lookup") {
      const key = Deno.env.get("ANTHROPIC_API_KEY"); if (!key) throw new HttpError(503, "ANTHROPIC_API_KEY is not set");
      const it = b.item ?? {};
      const desc = [it.brand && `Brand: ${it.brand}`, it.name && `Item: ${it.name}`, it.type_label && `Type: ${it.type_label}`, it.pattern && `Pattern: ${it.pattern}`, it.color && `Color: ${it.color}`, it.size && `Size: ${it.size}`, it.material && `Material: ${it.material}`,
        it.style_hint && `Visible details: ${it.style_hint}`, it.paid_cents && `He paid $${(it.paid_cents / 100).toFixed(2)}`, it.store && `Bought at: ${it.store}`, it.condition && `Condition: ${it.condition}`].filter(Boolean).join("\n");
      const REPORT = { name: "report_item", description: "Report what you found. Call exactly once, after searching.", input_schema: { type: "object", properties: {
        product_title: { type: "string" }, brand: { type: "string" }, product_url: { type: "string", description: "the official or major-retailer product page for this exact item, if found" },
        image_url: { type: "string", description: "direct URL of the product photo (jpg/png/webp) from that page, if you saw one" },
        retail_price_dollars: { type: "number", description: "full retail price (not a sale price)" }, material: { type: "string" }, care: { type: "string", description: "care instructions from the product page" },
        est_value_dollars: { type: "number", description: "what it would sell for used today in the given condition, from resale listings (Poshmark, eBay sold, thredUP, Mercari)" },
        value_basis: { type: "string", description: "one or two sentences: which listings or prices the estimate is based on, with sites" },
        confidence: { type: "string", enum: ["high", "medium", "low"], description: "high = exact product found; low = only similar items" } }, required: ["product_title", "confidence", "value_basis"] } };
      const content: any[] = [{ type: "text", text: `Find this exact clothing item online for Samuel's closet app.\n${desc}\n\nSearch for the product page (brand site or a major retailer) to get the product title, a product photo URL, the retail price and material. Then estimate its used value today in the stated condition from resale listings. Then call report_item once. If you can't find the exact item, report the closest match with confidence low.` }];
      if (b.data) content.unshift({ type: "image", source: { type: "base64", media_type: String(b.media_type || "image/jpeg"), data: String(b.data) } });
      let convo: any[] = [{ role: "user", content }], found: any = null;
      for (let turn = 0; turn < 6 && !found; turn++) {
        const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST",
          headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
          body: JSON.stringify({ model: MODEL, max_tokens: 2500, tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 5 }, REPORT], messages: convo }) });
        const out = await r.json();
        if (!r.ok) throw new HttpError(502, /web.?search/i.test(out?.error?.message ?? "") ? "Web search is turned off for this Anthropic account (Claude Console → enable web search)." : `AI request failed: ${out?.error?.message ?? r.status}`);
        found = (out.content ?? []).find((c: any) => c.type === "tool_use" && c.name === "report_item")?.input ?? null;
        if (found) break;
        if (out.stop_reason === "pause_turn") { convo = [...convo, { role: "assistant", content: out.content }]; continue; }
        convo = [...convo, { role: "assistant", content: out.content }, { role: "user", content: "Now call report_item with what you found." }];
      }
      if (!found) throw new HttpError(502, "Couldn't find the item");
      // the product photo: given URL, else the page's og:image; copied into our own private storage
      let imageUrl = String(found.image_url || ""); let stockPath: string | null = null;
      if (!/^https?:/.test(imageUrl) && /^https?:/.test(String(found.product_url || ""))) {
        try { const html = await (await fetch(found.product_url, { headers: { "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148" } })).text();
          imageUrl = (html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)/i) ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image/i) ?? [])[1] ?? ""; } catch { /* page blocked */ }
      }
      if (/^https?:/.test(imageUrl)) {
        try { const ir = await fetch(imageUrl, { headers: { "user-agent": "Mozilla/5.0", accept: "image/*" } }); const ct = ir.headers.get("content-type") ?? "";
          const buf = new Uint8Array(await ir.arrayBuffer());
          if (ir.ok && /^image\/(jpeg|png|webp)/.test(ct) && buf.length > 2000 && buf.length < 8_000_000) {
            stockPath = `stock/${crypto.randomUUID()}.${ct.includes("png") ? "png" : ct.includes("webp") ? "webp" : "jpg"}`;
            const { error } = await admin.storage.from("closet").upload(stockPath, buf, { contentType: ct.split(";")[0], upsert: false });
            if (error) stockPath = null;
          } } catch { stockPath = null; }
      }
      const cents = (d: unknown) => (typeof d === "number" && isFinite(d) && d > 0) ? Math.round(d * 100) : null;
      return json(req, { product_title: found.product_title ?? null, brand: found.brand ?? null, product_url: /^https?:/.test(String(found.product_url ?? "")) ? found.product_url : null,
        retail_price_cents: cents(found.retail_price_dollars), est_value_cents: cents(found.est_value_dollars), value_basis: found.value_basis ?? null,
        material: found.material ?? null, care: found.care ?? null, confidence: found.confidence ?? "low", stock_image_path: stockPath });
    }
    throw new HttpError(400, "Unknown action");
  } catch (e) { return json(req, { error: errMessage(e) }, errStatus(e)); }
});
