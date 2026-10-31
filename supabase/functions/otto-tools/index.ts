// otto-tools: outside-world helpers for the app. Owner sign-in required.
//  vin      → NHTSA vPIC decode (year, make, model, trim, engine…)
//  recalls  → NHTSA recalls for make/model/year
//  listing  → read an apartment listing page (rent, beds, baths, address)
//  clothing → identify a garment photo (name, category, color, season, warmth)
import { requireOwner, json, cors, errMessage, errStatus, HttpError } from "./common.ts";
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
      const f = await claudeTool([{ type: "image", source: { type: "base64", media_type: String(b.media_type || "image/jpeg"), data: String(b.data) } },
        { type: "text", text: "Identify this clothing item for a closet app." }], {
        name: "garment", description: "The garment in the photo.", input_schema: { type: "object", properties: {
          name: { type: "string", description: "short, e.g. 'Navy quarter-zip', 'Gray chinos'" }, category: { type: "string", enum: ["top", "bottom", "outerwear", "shoes", "accessory", "other"] },
          color: { type: "string" }, brand: { type: "string" }, season: { type: "string", enum: ["all", "warm", "cold", "spring/fall"] },
          warmth: { type: "integer", minimum: 1, maximum: 5, description: "1 = very light, 5 = heavy winter" }, wears_before_wash: { type: "integer", minimum: 1, maximum: 10, description: "typical: tees/underlayers 1, shirts 1-2, jeans 4-6, sweaters 3-5, outerwear 10" } },
          required: ["name", "category"] } });
      return json(req, f);
    }
    throw new HttpError(400, "Unknown action");
  } catch (e) { return json(req, { error: errMessage(e) }, errStatus(e)); }
});
