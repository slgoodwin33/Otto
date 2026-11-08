// Minimal iCalendar (RFC 5545) VEVENT parser for CalDAV results: unfolding, params, TZID → UTC, all-day, DURATION.
export type Occ = { uid: string; title: string; start: string; end: string | null; all_day: boolean; location: string | null; notes: string | null; url: string | null; status: string | null; recurring: boolean; rrule: string | null; recurrence_id: string | null; exdates: string[]; tz: string; local: number[] | null };

export function unfold(text: string): string[] {
  return text.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "").split(/\r?\n/).filter(Boolean);
}
function unescape(v: string) { return v.replace(/\\n/gi, "\n").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\"); }

/** Offset (minutes) of an IANA zone at a given UTC instant, using Intl. */
function tzOffsetMin(utcMs: number, tz: string): number {
  const f = new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const p: Record<string, string> = {}; for (const x of f.formatToParts(new Date(utcMs))) p[x.type] = x.value;
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return (asUtc - utcMs) / 60000;
}
/** Wall-clock time in tz → UTC ISO. Two passes handle DST edges. */
export function zonedToUtc(y: number, mo: number, d: number, h: number, mi: number, s: number, tz: string): string {
  const guess = Date.UTC(y, mo - 1, d, h, mi, s);
  let t = guess - tzOffsetMin(guess, tz) * 60000;
  t = guess - tzOffsetMin(t, tz) * 60000;
  return new Date(t).toISOString();
}
const WINDOWS_TZ: Record<string, string> = { "Eastern Standard Time": "America/New_York", "Central Standard Time": "America/Chicago", "Mountain Standard Time": "America/Denver", "Pacific Standard Time": "America/Los_Angeles" };

export function parseDate(value: string, params: Record<string, string>, defaultTz: string): { iso: string; allDay: boolean } {
  const v = value.trim();
  if (params.VALUE === "DATE" || /^\d{8}$/.test(v)) {
    // all-day: anchor at local midnight in the user's zone
    return { iso: zonedToUtc(+v.slice(0, 4), +v.slice(4, 6), +v.slice(6, 8), 0, 0, 0, defaultTz), allDay: true };
  }
  const m = v.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/);
  if (!m) return { iso: new Date(v).toISOString(), allDay: false };
  const [, y, mo, d, h, mi, s, z] = m;
  if (z) return { iso: new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +s)).toISOString(), allDay: false };
  let tz = params.TZID ? params.TZID.replace(/^"|"$/g, "") : defaultTz;
  tz = WINDOWS_TZ[tz] ?? tz;
  try { return { iso: zonedToUtc(+y, +mo, +d, +h, +mi, +s, tz), allDay: false }; }
  catch { return { iso: zonedToUtc(+y, +mo, +d, +h, +mi, +s, defaultTz), allDay: false }; }
}
function durationMs(d: string): number {
  const m = d.match(/^([+-])?P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/);
  if (!m) return 0;
  const [, sign, w, dd, h, mi, s] = m;
  const ms = ((+(w || 0) * 7 + +(dd || 0)) * 86400 + +(h || 0) * 3600 + +(mi || 0) * 60 + +(s || 0)) * 1000;
  return sign === "-" ? -ms : ms;
}

export function parseVEvents(ics: string, defaultTz = "America/New_York"): Occ[] {
  const out: Occ[] = []; let cur: Record<string, { v: string; p: Record<string, string> }[]> | null = null; let depth = 0;
  for (const line of unfold(ics)) {
    if (line === "BEGIN:VEVENT") { cur = {}; depth = 0; continue; }
    if (!cur) continue;
    if (line.startsWith("BEGIN:")) { depth++; continue; }          // e.g. VALARM inside the event
    if (line.startsWith("END:") && depth > 0) { depth--; continue; }
    if (line === "END:VEVENT") {
      const get = (k: string) => cur![k]?.[0];
      const ds = get("DTSTART");
      if (ds) {
        const st = parseDate(ds.v, ds.p, defaultTz);
        let end: string | null = null;
        const de = get("DTEND"), du = get("DURATION");
        if (de) end = parseDate(de.v, de.p, defaultTz).iso;
        else if (du) end = new Date(Date.parse(st.iso) + durationMs(du.v)).toISOString();
        else if (st.allDay) end = new Date(Date.parse(st.iso) + 86400000).toISOString();
        const rid = get("RECURRENCE-ID");
        const tzid = (ds.p.TZID ? (WINDOWS_TZ[ds.p.TZID.replace(/^"|"$/g, "")] ?? ds.p.TZID.replace(/^"|"$/g, "")) : defaultTz);
        const lm = ds.v.trim().match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z?))?$/);
        const local = lm ? (lm[7] === "Z" ? null : [+lm[1], +lm[2], +lm[3], +(lm[4] || 0), +(lm[5] || 0), +(lm[6] || 0)]) : null;
        out.push({ uid: get("UID")?.v ?? "", title: unescape(get("SUMMARY")?.v ?? "(No title)"), start: st.iso, end, all_day: st.allDay,
          location: get("LOCATION") ? unescape(get("LOCATION")!.v) : null, notes: get("DESCRIPTION") ? unescape(get("DESCRIPTION")!.v).slice(0, 2000) : null,
          url: get("URL")?.v ?? null, status: get("STATUS")?.v?.toLowerCase() ?? null, recurring: !!(get("RRULE") || rid),
          rrule: get("RRULE")?.v ?? null, recurrence_id: rid ? parseDate(rid.v, rid.p, defaultTz).iso : null,
          exdates: (cur["EXDATE"] ?? []).flatMap((x) => x.v.split(",").map((d) => parseDate(d, x.p, defaultTz).iso)), tz: tzid, local });
      }
      cur = null; continue;
    }
    if (depth > 0) continue;
    const ci = line.indexOf(":"); if (ci < 0) continue;
    const head = line.slice(0, ci), value = line.slice(ci + 1);
    const [name, ...ps] = head.split(";");
    const params: Record<string, string> = {}; for (const p of ps) { const [k, v] = p.split("="); params[k.toUpperCase()] = v ?? ""; }
    (cur[name.toUpperCase()] ??= []).push({ v: value, p: params });
  }
  return out;
}

/** Expand a simple RRULE (DAILY/WEEKLY/MONTHLY/YEARLY, INTERVAL, COUNT, UNTIL, BYDAY for weekly) inside [from, to).
 *  Steps in the event's own wall-clock time so a 9:00 AM meeting stays 9:00 AM across DST changes. Used only if the server didn't expand. */
export function expandRRule(o: Occ, from: number, to: number, defaultTz = "America/New_York"): Occ[] {
  if (!o.rrule) return [o];
  const r: Record<string, string> = {}; for (const kv of o.rrule.split(";")) { const [k, v] = kv.split("="); r[k] = v; }
  const freq = r.FREQ, interval = +(r.INTERVAL || 1), count = r.COUNT ? +r.COUNT : Infinity;
  const until = r.UNTIL ? Date.parse(parseDate(r.UNTIL, {}, defaultTz).iso) : Infinity;
  const startMs = Date.parse(o.start), dur = o.end ? Date.parse(o.end) - startMs : 0;
  const ex = new Set(o.exdates);
  // wall-clock start (UTC-anchored events step in UTC)
  const L = o.local ?? (() => { const d = new Date(startMs); return [d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds()]; })();
  const tz = o.local ? o.tz : "UTC";
  const toUtc = (y: number, m: number, d: number) => o.all_day ? zonedToUtc(y, m, d, 0, 0, 0, defaultTz) : (tz === "UTC" ? new Date(Date.UTC(y, m - 1, d, L[3], L[4], L[5])).toISOString() : zonedToUtc(y, m, d, L[3], L[4], L[5], tz));
  const dayNum = Date.UTC(L[0], L[1] - 1, L[2]) / 86400000;       // date arithmetic on the naive local date
  const ymd = (n: number) => { const d = new Date(n * 86400000); return [d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()]; };
  const days = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
  const byday = r.BYDAY && freq === "WEEKLY" ? r.BYDAY.split(",").map((x) => days.indexOf(x.slice(-2))) : null;
  const res: Occ[] = []; let n = 0;
  for (let i = 0; i < 3000 && n < count; i++) {
    let cands: number[][] = [];
    if (freq === "DAILY") cands = [ymd(dayNum + i * interval)];
    else if (freq === "WEEKLY") {
      const wk = dayNum + i * interval * 7, dow = new Date(wk * 86400000).getUTCDay();
      cands = (byday ?? [dow]).map((bd) => ymd(wk + ((bd - dow + 7) % 7))).sort((a, b) => Date.UTC(a[0], a[1], a[2]) - Date.UTC(b[0], b[1], b[2]));
    } else if (freq === "MONTHLY") { const t = new Date(Date.UTC(L[0], L[1] - 1 + i * interval, L[2])); if (t.getUTCDate() !== L[2]) continue; cands = [[t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate()]]; }
    else if (freq === "YEARLY") cands = [[L[0] + i * interval, L[1], L[2]]];
    else return [o];
    for (const [y, m, d] of cands) {
      const iso = toUtc(y, m, d), t = Date.parse(iso);
      if (t < startMs) continue;
      if (t > until || n >= count) return res;
      n++;
      if (t >= to) return res;
      if (t + dur >= from && !ex.has(iso)) res.push({ ...o, start: iso, end: o.end ? new Date(t + dur).toISOString() : null, recurring: true });
    }
  }
  return res;
}
