// calendar-sync: reads iCloud calendars over CalDAV (app-specific password) into calendar_events, hourly via pg_cron.
// Auth: x-sync-key (cron) or the owner's sign-in (manual "sync now").
import { parseVEvents, expandRRule, type Occ } from "./ics.ts";

const URL_ = Deno.env.get("SUPABASE_URL")!, SR = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const H = { apikey: SR, Authorization: `Bearer ${SR}`, "Content-Type": "application/json" };
const OWNER = "slgoodwin33@gmail.com", TZ = "America/New_York";
const CORS = { "Access-Control-Allow-Origin": "https://slgoodwin33.github.io", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-sync-key", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

async function secret(name: string): Promise<string | null> {
  const r = await fetch(`${URL_}/rest/v1/app_secrets?name=eq.${name}&select=value`, { headers: H });
  return r.ok ? ((await r.json())[0]?.value ?? null) : null;
}
async function authorized(req: Request): Promise<boolean> {
  const k = req.headers.get("x-sync-key");
  if (k) return k === (await secret("sync_key"));
  const tok = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!tok) return false;
  const r = await fetch(`${URL_}/auth/v1/user`, { headers: { apikey: SR, Authorization: `Bearer ${tok}` } });
  return r.ok && String((await r.json()).email ?? "").toLowerCase() === OWNER;
}

const xmlText = (s: string) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#13;/g, "").replace(/&#10;/g, "\n").replace(/&amp;/g, "&");
const tag = (xml: string, name: string) => { const m = xml.match(new RegExp(`<(?:[\\w-]+:)?${name}(?:\\s[^>]*)?>([\\s\\S]*?)</(?:[\\w-]+:)?${name}>`, "i")); return m ? m[1] : null; };
const href = (xml: string | null) => xml ? (xml.match(/<(?:[\w-]+:)?href(?:\s[^>]*)?>\s*([^<\s]+)\s*</i)?.[1] ?? null) : null;
const responses = (xml: string) => xml.split(/<(?:[\w-]+:)?response[\s>]/i).slice(1);

async function dav(url: string, method: string, auth: string, depth: string, body: string) {
  const r = await fetch(url, { method, headers: { Authorization: auth, Depth: depth, "Content-Type": "application/xml; charset=utf-8" }, body, redirect: "follow" });
  if (r.status === 401) throw new Error("iCloud rejected the Apple ID or app-specific password");
  if (!r.ok && r.status !== 207) throw new Error(`iCloud ${method} ${r.status}`);
  return await r.text();
}
const icsDate = (ms: number) => new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (!(await authorized(req))) return json({ error: "Not allowed" }, 401);
  try {
    const id = await secret("ICLOUD_APPLE_ID"), pw = await secret("ICLOUD_APP_PASSWORD");
    if (!id || !pw) return json({ error: "Add ICLOUD_APPLE_ID and ICLOUD_APP_PASSWORD to app_secrets first" }, 400);
    const auth = "Basic " + btoa(`${id.trim()}:${pw.trim()}`);
    const base = "https://caldav.icloud.com/";
    // 1) who am I  2) where are my calendars  3) which collections are event calendars
    const p1 = await dav(base, "PROPFIND", auth, "0", `<?xml version="1.0"?><d:propfind xmlns:d="DAV:"><d:prop><d:current-user-principal/></d:prop></d:propfind>`);
    const principal = href(tag(p1, "current-user-principal")); if (!principal) throw new Error("No CalDAV principal returned");
    const pUrl = new URL(principal, base).toString();
    const p2 = await dav(pUrl, "PROPFIND", auth, "0", `<?xml version="1.0"?><d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav"><d:prop><c:calendar-home-set/></d:prop></d:propfind>`);
    const home = href(tag(p2, "calendar-home-set")); if (!home) throw new Error("No calendar home returned");
    const hUrl = new URL(home, pUrl).toString();
    const p3 = await dav(hUrl, "PROPFIND", auth, "1", `<?xml version="1.0"?><d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav"><d:prop><d:displayname/><d:resourcetype/><c:supported-calendar-component-set/></d:prop></d:propfind>`);
    const cals = responses(p3).filter((r) => /<(?:[\w-]+:)?calendar[\s/>]/i.test(tag(r, "resourcetype") ?? "") && /VEVENT/i.test(r))
      .map((r) => ({ url: new URL(href(r)!, hUrl).toString(), name: xmlText(tag(r, "displayname") ?? "Calendar") }));

    const from = Date.now() - 7 * 86400000, to = Date.now() + 60 * 86400000;
    const all: (Occ & { calendar: string })[] = [];
    for (const cal of cals) {
      const rep = await dav(cal.url, "REPORT", auth, "1", `<?xml version="1.0"?><c:calendar-query xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav"><d:prop><c:calendar-data><c:expand start="${icsDate(from)}" end="${icsDate(to)}"/></c:calendar-data></d:prop><c:filter><c:comp-filter name="VCALENDAR"><c:comp-filter name="VEVENT"><c:time-range start="${icsDate(from)}" end="${icsDate(to)}"/></c:comp-filter></c:comp-filter></c:filter></c:calendar-query>`);
      for (const r of responses(rep)) {
        const data = tag(r, "calendar-data"); if (!data) continue;
        const evs = parseVEvents(xmlText(data), TZ);
        // overrides (RECURRENCE-ID) replace the generated occurrence at that original time
        const overrides = new Map(evs.filter((e) => e.recurrence_id).map((e) => [e.recurrence_id!, e]));
        for (const e of evs) {
          if (e.recurrence_id) continue;
          const occs = e.rrule ? expandRRule(e, from, to, TZ) : [e];   // no-op when the server already expanded
          for (const o of occs) { const ov = overrides.get(o.start); all.push({ ...(ov ?? o), calendar: cal.name }); if (ov) overrides.delete(o.start); }
        }
        for (const ov of overrides.values()) all.push({ ...ov, calendar: cal.name });
      }
    }
    const events = all.filter((e) => e.status !== "cancelled" && Date.parse(e.start) < to && Date.parse(e.end ?? e.start) >= from)
      .map((e) => ({ uid: e.uid, calendar: e.calendar, title: e.title, start: e.start, end: e.end, all_day: e.all_day, location: e.location, notes: e.notes, url: e.url, status: e.status, recurring: e.recurring }));
    const r = await fetch(`${URL_}/rest/v1/rpc/calendar_ingest`, { method: "POST", headers: H, body: JSON.stringify({ p_source: "icloud", p_from: new Date(from).toISOString(), p_to: new Date(to).toISOString(), p_events: events }) });
    const result = r.ok ? await r.json() : { error: await r.text() };
    const summary = { calendars: cals.map((c) => c.name), events: events.length, ...result };
    console.log("calendar-sync", JSON.stringify(summary));
    return json(summary, r.ok ? 200 : 500);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.log("calendar-sync error", msg);
    return json({ error: msg }, 502);
  }
});
