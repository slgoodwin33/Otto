// location-ingest: receives phone location points (OwnTracks HTTP mode or Overland) into location_points.
// Auth: ?key=..., x-otto-key header, or HTTP Basic password, checked against app_secrets LOCATION_INGEST_KEY.
const URL_ = Deno.env.get("SUPABASE_URL")!;
const SR = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const H = { apikey: SR, Authorization: `Bearer ${SR}`, "Content-Type": "application/json" };
let cachedKey: string | null = null;
async function ingestKey() {
  if (cachedKey) return cachedKey;
  const r = await fetch(`${URL_}/rest/v1/app_secrets?name=eq.LOCATION_INGEST_KEY&select=value`, { headers: H });
  cachedKey = r.ok ? ((await r.json())[0]?.value ?? null) : null;
  return cachedKey;
}
function sentKey(req: Request): string | null {
  const u = new URL(req.url);
  if (u.searchParams.get("key")) return u.searchParams.get("key");
  if (req.headers.get("x-otto-key")) return req.headers.get("x-otto-key");
  const auth = req.headers.get("authorization") ?? "";
  if (/^basic /i.test(auth)) { try { const d = atob(auth.slice(6)); return d.slice(d.indexOf(":") + 1); } catch { /* ignore */ } }
  return null;
}
const num = (v: unknown) => (typeof v === "number" && isFinite(v) ? v : null);

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("POST only", { status: 405 });
  const key = await ingestKey();
  if (!key || (sentKey(req) ?? "").trim() !== key) return new Response("Unauthorized", { status: 401 });
  let body: any; try { body = await req.json(); } catch { return new Response("Body must be JSON", { status: 400 }); }

  const rows: any[] = [], events: any[] = [], regions: any[] = [];
  let overland = false;
  if (Array.isArray(body?.locations)) {            // Overland: GeoJSON features
    overland = true;
    for (const f of body.locations) {
      const c = f?.geometry?.coordinates, p = f?.properties ?? {};
      if (!Array.isArray(c) || !p.timestamp) continue;
      rows.push({ recorded_at: p.timestamp, lon: c[0], lat: c[1], accuracy_m: num(p.horizontal_accuracy), altitude_m: num(p.altitude),
        speed_kmh: num(p.speed) != null && p.speed >= 0 ? p.speed * 3.6 : null, battery_pct: num(p.battery_level) != null ? Math.round(p.battery_level * 100) : null,
        source: "overland", device: p.device_id ?? null });
    }
  } else {                                           // OwnTracks: one message or an array of them
    for (const m of Array.isArray(body) ? body : [body]) {
      if (m?._type === "transition" && (m.event === "enter" || m.event === "leave") && m.tst) {
        events.push({ name: m.desc ?? null, rid: m.rid ?? null, event: m.event, at: new Date(m.tst * 1000).toISOString(), lat: num(m.lat), lon: num(m.lon) });
        if (num(m.lat) != null && num(m.lon) != null) rows.push({ recorded_at: new Date(m.tst * 1000).toISOString(), lat: m.lat, lon: m.lon, accuracy_m: num(m.acc), altitude_m: null, speed_kmh: null, battery_pct: null, source: "owntracks", device: m.tid ?? null });
        continue;
      }
      if (m?._type === "waypoint" || m?._type === "waypoints") {
        for (const w of m._type === "waypoints" ? (m.waypoints ?? []) : [m]) if (w?.desc) regions.push({ name: w.desc, rid: w.rid ?? null, lat: num(w.lat), lon: num(w.lon), radius: num(w.rad) });
        continue;
      }
      if (m?._type !== "location" || num(m.lat) == null || num(m.lon) == null || !m.tst) continue;
      rows.push({ recorded_at: new Date(m.tst * 1000).toISOString(), lat: m.lat, lon: m.lon, accuracy_m: num(m.acc), altitude_m: num(m.alt),
        speed_kmh: num(m.vel), battery_pct: num(m.batt), source: "owntracks", device: m.tid ?? null });
    }
  }
  if (rows.length) {
    const r = await fetch(`${URL_}/rest/v1/location_points?on_conflict=source,recorded_at`, {
      method: "POST", headers: { ...H, Prefer: "resolution=ignore-duplicates,return=minimal" }, body: JSON.stringify(rows) });
    if (!r.ok) return new Response(await r.text(), { status: 500 });
  }
  let places: unknown = null;
  if (events.length || regions.length) {
    const r = await fetch(`${URL_}/rest/v1/rpc/ingest_places`, { method: "POST", headers: H, body: JSON.stringify({ p_regions: regions, p_events: events }) });
    if (!r.ok) return new Response(await r.text(), { status: 500 });
    places = await r.json();
  }
  // Timeline: find stops in the last 2 days, then name up to 3 new ones (OpenStreetMap reverse geocoding, 1 request/second)
  let timeline: unknown = null;
  if (rows.length) {
    const since = new Date(Date.now() - 2 * 86400000).toISOString();
    const d = await fetch(`${URL_}/rest/v1/rpc/detect_stays`, { method: "POST", headers: H, body: JSON.stringify({ p_since: since }) });
    timeline = d.ok ? await d.json() : await d.text();
    const q = await fetch(`${URL_}/rest/v1/visits?select=id,lat,lon&source=eq.detected&location_id=is.null&place_name=is.null&lat=not.is.null&order=arrived_at.desc&limit=3`, { headers: H });
    for (const v of (q.ok ? await q.json() : [])) {
      try {
        const g = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&lat=${v.lat}&lon=${v.lon}`, { headers: { "User-Agent": "Otto personal app (slgoodwin33@gmail.com)", "Accept-Language": "en" } });
        if (!g.ok) break;
        const j = await g.json(), a = j.address ?? {};
        const street = [a.house_number, a.road].filter(Boolean).join(" ");
        const name = j.name || a.amenity || a.shop || a.building || street || a.neighbourhood || a.suburb || null;
        const town = a.town || a.city || a.village || a.suburb || "";
        const label = name ? (town && !String(name).includes(town) ? `${name}, ${town}` : String(name)) : (town || null);
        if (label) await fetch(`${URL_}/rest/v1/visits?id=eq.${v.id}`, { method: "PATCH", headers: { ...H, Prefer: "return=minimal" }, body: JSON.stringify({ place_name: label }) });
        await new Promise((r) => setTimeout(r, 1100));
      } catch { break; }
    }
  }
  console.log("location-ingest", rows.length, JSON.stringify(places), JSON.stringify(timeline));
  return new Response(overland ? JSON.stringify({ result: "ok" }) : "[]", { headers: { "Content-Type": "application/json" } });
});
