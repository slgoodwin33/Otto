// health-ingest: receives Health Auto Export (REST API automation, JSON) and writes
// workouts + daily activity into Otto via public.health_ingest(). Auth: x-otto-key header.
const URL_ = Deno.env.get("SUPABASE_URL")!;
const SR = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const H = { apikey: SR, Authorization: `Bearer ${SR}`, "Content-Type": "application/json" };

let cachedKey: string | null = null;
async function ingestKey(): Promise<string | null> {
  if (cachedKey) return cachedKey;
  const r = await fetch(`${URL_}/rest/v1/app_secrets?name=eq.HEALTH_INGEST_KEY&select=value`, { headers: H });
  if (!r.ok) return null;
  const rows = await r.json();
  cachedKey = rows[0]?.value ?? null;
  return cachedKey;
}

// "2026-10-09 18:30:00 -0400" -> ISO; ISO passes through
function toIso(s: unknown): string | null {
  if (typeof s !== "string") return null;
  const m = s.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})(?:\.\d+)?\s*([+-]\d{2}):?(\d{2})$/);
  if (m) return `${m[1]}T${m[2]}${m[3]}:${m[4]}`;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString();
}
const localDate = (s: unknown) => (typeof s === "string" && /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : null);
const num = (v: any): number | null => { const n = typeof v === "object" && v ? Number(v.qty) : Number(v); return isFinite(n) ? n : null; };
const unitOf = (v: any): string => (v && typeof v === "object" && typeof v.units === "string" ? v.units.toLowerCase() : "");

function kcal(v: any): number | null { const n = num(v); if (n == null) return null; return unitOf(v) === "kj" ? n / 4.184 : n; }
function miles(v: any): { qty: number | null; unit: string | null } {
  const n = num(v); if (n == null) return { qty: null, unit: null };
  const u = unitOf(v);
  if (u === "km") return { qty: n * 0.621371, unit: "mi" };
  if (u === "m") return { qty: n / 1609.344, unit: "mi" };
  return { qty: n, unit: "mi" };
}
function activityType(name: string): string {
  const n = (name || "").toLowerCase();
  if (n.includes("run")) return "running";
  if (n.includes("walk")) return "walking";
  if (n.includes("strength")) return "strength_training";
  if (n.includes("cycl") || n.includes("bik")) return "cycling";
  if (n.includes("basketball")) return "basketball";
  return n.replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "other";
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("POST only", { status: 405 });
  const key = await ingestKey();
  if (!key || req.headers.get("x-otto-key") !== key) return new Response("Unauthorized", { status: 401 });

  let body: any;
  try { body = await req.json(); } catch { return new Response("Body must be JSON", { status: 400 }); }
  const data = body?.data ?? body;
  const metrics: any[] = Array.isArray(data?.metrics) ? data.metrics : [];
  const rawWorkouts: any[] = Array.isArray(data?.workouts) ? data.workouts : [];

  const workouts = rawWorkouts.map((w) => {
    const start = toIso(w.start), end = toIso(w.end);
    const dur = num(w.duration) ?? (start && end ? (Date.parse(end) - Date.parse(start)) / 1000 : null);
    const dist = miles(w.distance);
    const hr = num(w.avgHeartRate) ?? num(w.heartRate?.avg);
    return {
      external_id: w.id ? `hae:${w.id}` : `hae:${w.name}:${start}`,
      activity_type: activityType(w.name),
      start_time: start, end_time: end, duration_seconds: dur,
      active_energy_kcal: kcal(w.activeEnergyBurned ?? w.activeEnergy),
      total_energy_kcal: kcal(w.totalEnergy),
      distance_qty: dist.qty, distance_unit: dist.unit, avg_heart_rate: hr,
    };
  }).filter((w) => w.start_time);

  // daily totals: sum per local date (works whether the automation aggregates by day or not)
  const days: Record<string, any> = {};
  const day = (d: string) => (days[d] ??= { activity_date: d });
  for (const m of metrics) {
    const name = String(m.name || "").toLowerCase();
    const u = String(m.units || "").toLowerCase();
    for (const p of Array.isArray(m.data) ? m.data : []) {
      const d = localDate(p.date), q = Number(p.qty);
      if (!d || !isFinite(q)) continue;
      if (name === "step_count") day(d).steps = Math.round((day(d).steps ?? 0) + q);
      else if (name === "active_energy") day(d).active_energy_kcal = (day(d).active_energy_kcal ?? 0) + (u === "kj" ? q / 4.184 : q);
      else if (name === "resting_heart_rate") day(d).resting_hr_bpm = Math.round(q);
      else if (name === "heart_rate_variability") day(d).hrv_ms = Math.round(q * 10) / 10;
      else if (name === "walking_running_distance") {
        const mi = u === "km" ? q * 0.621371 : u === "m" ? q / 1609.344 : q;
        day(d).distance_qty = (day(d).distance_qty ?? 0) + mi; day(d).distance_unit = "mi";
      }
    }
  }

  // Sleep: one entry per night (aggregated) with stage totals in hours by default; sleep_date = the date HAE assigns (the morning you woke)
  const sleep: any[] = [], weights: any[] = [];
  const toMin = (v: unknown, units: string) => { const x = Number(v); if (!isFinite(x)) return null; return units.startsWith("min") ? Math.round(x) : Math.round(x * 60); };
  for (const m of metrics) {
    const name = String(m.name || "").toLowerCase(), u = String(m.units || "hr").toLowerCase();
    if (name === "sleep_analysis") {
      for (const p of Array.isArray(m.data) ? m.data : []) {
        const d = localDate(p.date) ?? localDate(p.sleepEnd); if (!d) continue;
        if (p.value !== undefined && p.qty !== undefined) continue; // per-stage rows (unaggregated) aren't used; ask for aggregated sleep
        const asleep = p.totalSleep ?? p.asleep;
        sleep.push({ sleep_date: d, bedtime: toIso(p.sleepStart) ?? toIso(p.inBedStart), wake_time: toIso(p.sleepEnd) ?? toIso(p.inBedEnd),
          in_bed_min: toMin(p.inBed, u), asleep_min: toMin(asleep, u), deep_min: toMin(p.deep, u), rem_min: toMin(p.rem, u), core_min: toMin(p.core, u), awake_min: toMin(p.awake, u) });
      }
    } else if (name === "weight_body_mass" || name === "body_mass") {
      for (const p of Array.isArray(m.data) ? m.data : []) {
        const at = toIso(p.date), q = Number(p.qty); if (!at || !isFinite(q)) continue;
        weights.push({ measured_at: at, weight_lb: u === "kg" ? Math.round(q * 2.20462 * 10) / 10 : Math.round(q * 10) / 10 });
      }
    }
  }

  const r = await fetch(`${URL_}/rest/v1/rpc/health_ingest`, {
    method: "POST", headers: H,
    body: JSON.stringify({ p_workouts: workouts, p_days: Object.values(days), p_sleep: sleep, p_body: weights }),
  });
  const result = r.ok ? await r.json() : { error: await r.text() };
  const summary = { ...result, metrics_received: metrics.map((m) => m.name), workouts_received: rawWorkouts.length };
  console.log("health-ingest", JSON.stringify(summary));
  return new Response(JSON.stringify(summary), { status: r.ok ? 200 : 500, headers: { "Content-Type": "application/json" } });
});
