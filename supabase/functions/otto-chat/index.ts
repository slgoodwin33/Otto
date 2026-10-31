// otto-chat: answers questions about Samuel's own data. Read-only. Owner sign-in required.
import { requireOwner, json, cors, admin, errMessage, errStatus, HttpError } from "./common.ts";

const MODEL = Deno.env.get("OTTO_MODEL") ?? "claude-sonnet-5-5";
const TZ = "America/New_York";
const usd = (c: number | null | undefined) => c == null ? "?" : (c < 0 ? "-" : "") + "$" + (Math.abs(c) / 100).toFixed(2);
const localDate = (d = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);
const daysAgo = (n: number) => localDate(new Date(Date.now() - n * 86400000));

async function q(p: PromiseLike<{ data: any; error: any }>) { const { data, error } = await p; if (error) throw new Error(error.message); return data ?? []; }

/** A compact, plain-text snapshot of what's in the database right now. */
async function snapshot(): Promise<string> {
  const today = localDate();
  const [summary, accounts, txns, todos, plans, daily, workouts, bills, goals] = await Promise.all([
    q(admin.from("v_weekly_summary").select("*").lte("week_start", today).order("week_start", { ascending: false }).limit(1)),
    q(admin.from("accounts").select("name, institution, account_type, current_balance_cents, available_balance_cents, balance_updated_at").eq("status", "active")),
    q(admin.from("transactions").select("transaction_date, merchant, description, amount_cents, pending, exclude_from_budget, location_city, category:transaction_categories(name)").is("removed_at", null).gte("transaction_date", daysAgo(30)).order("transaction_date", { ascending: false }).limit(250)),
    q(admin.from("todos").select("code, title, priority, due_date, status, someday, notes, project:projects(title)").eq("status", "open").order("due_date", { ascending: true, nullsFirst: false }).limit(60)),
    q(admin.from("meal_plans").select("id, week_start, budget_cents, notes, meal_plan_items(planned_date, meal_type, title, leftover_of, recipe:recipes(name))").order("week_start", { ascending: false }).limit(1)),
    q(admin.from("daily_activity").select("activity_date, steps, active_energy_kcal, distance_walking_running_qty").gte("activity_date", daysAgo(30)).order("activity_date", { ascending: false })),
    q(admin.from("workouts").select("activity_type, start_time, duration_seconds, active_energy_kcal, avg_heart_rate").order("start_time", { ascending: false }).limit(6)),
    q(admin.from("v_bill_status").select("name, amount_cents, frequency, due_day, autopay, status, paid_on")),
    q(admin.from("financial_goals").select("name, target_amount_cents, saved_amount_cents, target_date").eq("status", "active")),
  ]);
  const lines: string[] = [`Today is ${new Date().toLocaleDateString("en-US", { timeZone: TZ, weekday: "long", month: "long", day: "numeric", year: "numeric" })} (${today}).`];

  const s = summary[0];
  if (s) {
    const cats = await q(admin.from("v_weekly_budget").select("category, category_type, planned_cents, carried_in_cents, spent_cents").eq("period_code", s.period_code));
    lines.push(`\n## Budget week ${s.week_start} to ${s.week_end}`);
    for (const c of cats) lines.push(`- ${c.category} (${c.category_type}): spent ${usd(Number(c.spent_cents))} of ${usd(c.planned_cents + (c.carried_in_cents || 0))}`);
  }
  lines.push(`\n## Accounts`);
  for (const a of accounts) lines.push(`- ${a.name} (${a.institution ?? ""}, ${a.account_type}): balance ${usd(a.current_balance_cents)}${a.balance_updated_at ? `, as of ${a.balance_updated_at.slice(0, 10)}` : ""}`);
  lines.push(`\n## Transactions, last 30 days (negative = money out)`);
  for (const t of txns) lines.push(`- ${t.transaction_date} ${t.merchant || t.description} ${usd(t.amount_cents)} [${t.exclude_from_budget ? "transfer, not spending" : (t.category?.name ?? "no category")}]${t.pending ? " pending" : ""}${t.location_city ? ` in ${t.location_city}` : ""}`);
  lines.push(`\n## Bills`);
  for (const b of bills) lines.push(`- ${b.name}: ${usd(b.amount_cents)} ${b.frequency}${b.due_day ? `, due day ${b.due_day}` : ""}${b.autopay ? ", autopay" : ""}, ${b.status}${b.paid_on ? ` (paid ${b.paid_on})` : ""}`);
  lines.push(`\n## Savings goals`);
  for (const g of goals) lines.push(`- ${g.name}: ${usd(g.saved_amount_cents)} saved${g.target_amount_cents ? ` of ${usd(g.target_amount_cents)}` : ", no target"}${g.target_date ? `, by ${g.target_date}` : ""}`);
  lines.push(`\n## Open todos (code in brackets — use it with update_todo)`);
  for (const t of todos) lines.push(`- [${t.code}] ${t.title}${t.priority ? ` (${t.priority})` : ""}${t.due_date ? ` due ${t.due_date}` : " no date"}${t.someday ? " someday" : ""}${t.project?.title ? ` (project: ${t.project.title})` : ""}`);
  const [uncat, cats, todayMeals, eaten, checkin, queue] = await Promise.all([
    q(admin.from("transactions").select("id, transaction_date, merchant, description, amount_cents, pending").is("removed_at", null).is("category_id", null).eq("exclude_from_budget", false).lt("amount_cents", 0).gte("transaction_date", daysAgo(14)).order("transaction_date", { ascending: false }).limit(40)),
    q(admin.from("transaction_categories").select("name, category_type").order("sort_order")),
    q(admin.from("meal_plan_items").select("id, meal_type, title, recipe:recipes(name)").eq("planned_date", today)),
    q(admin.from("meal_log").select("meal_type, kind, title, meal_plan_item_id").eq("eaten_on", today)),
    q(admin.from("daily_checkins").select("mood, energy, highlight, journal").eq("checkin_date", today)),
    q(admin.from("v_clarifications").select("kind, ref_id, title, detail, priority, occurred_on").order("priority").order("occurred_on", { ascending: false }).limit(40)),
  ]);
  const [stock, canMake, closet, docs, subs, cars, people, trips, asg, invoices] = await Promise.all([
    q(admin.from("pantry_items").select("quantity, unit, location, status, food:food_items(name)").neq("status", "out")),
    q(admin.from("v_can_make").select("name, have, required, missing")),
    q(admin.from("wardrobe_items").select("id, name, category, laundry_status, wears_since_wash, wears_before_wash").eq("retired", false)),
    q(admin.from("documents").select("name, kind, expires_on").not("expires_on", "is", null).lte("expires_on", daysAgo(-120)).order("expires_on")),
    q(admin.from("subscriptions").select("name, amount_cents, cadence, next_charge_on, status").neq("status", "cancelled")),
    q(admin.from("vehicles").select("id, year, make, model, odometer_miles, vehicle_services(service_on, kind, odometer_miles, next_due_on, next_due_miles)")),
    q(admin.from("people").select("id, name, relationship, birthday, last_seen_on, gift_ideas")),
    q(admin.from("trips").select("id, name, destination, start_on, end_on, status").neq("status", "cancelled")),
    q(admin.from("assignments").select("title, kind, due_at, done, course:courses(code, title)").eq("done", false)),
    q(admin.from("drone_invoices").select("number, amount_cents, due_on, status, client:drone_clients(name)").in("status", ["draft", "sent"])),
  ]);
  lines.push(`\n## At home (food stock): ${stock.length ? stock.map((p: any) => `${p.food?.name} ×${p.quantity}${p.unit ? " " + p.unit : ""}${p.location ? " (" + p.location + ")" : ""}${p.status === "low" ? " LOW" : ""}`).join("; ") : "nothing recorded"}`);
  lines.push(`## Can make now: ${canMake.filter((r: any) => r.required && r.have >= r.required).map((r: any) => r.name).join(", ") || "nothing fully stocked"}`);
  lines.push(`\n## Closet: ${closet.length} items; needs a wash: ${closet.filter((c: any) => c.laundry_status === "worn").map((c: any) => `[${c.id}] ${c.name}`).join(", ") || "nothing"}`);
  if (closet.length) lines.push(`- items: ${closet.map((c: any) => `[${c.id}] ${c.name} (${c.category ?? "?"}, ${c.laundry_status ?? "clean"})`).join("; ")}`);
  lines.push(`\n## Documents expiring within 120 days: ${docs.map((d: any) => `${d.name} ${d.expires_on}`).join("; ") || "none"}`);
  lines.push(`## Subscriptions: ${subs.map((x: any) => `${x.name} ${usd(x.amount_cents)}/${x.cadence}${x.next_charge_on ? " next " + x.next_charge_on : ""}${x.status !== "active" ? " (" + x.status + ")" : ""}`).join("; ") || "none"}`);
  lines.push(`## Vehicles: ${cars.map((v: any) => `[${v.id}] ${v.year} ${v.make} ${v.model}${v.odometer_miles ? ", " + v.odometer_miles + " mi" : ""}; services: ${(v.vehicle_services || []).slice(-3).map((x: any) => `${x.service_on} ${x.kind}${x.odometer_miles ? " @" + x.odometer_miles : ""}`).join(", ") || "none logged"}`).join(" | ") || "none"}`);
  lines.push(`## People: ${people.map((x: any) => `[${x.id}] ${x.name}${x.relationship ? " (" + x.relationship + ")" : ""}${x.birthday ? " bday " + x.birthday.slice(5) : ""}${x.last_seen_on ? " last seen " + x.last_seen_on : ""}`).join("; ") || "none"}`);
  lines.push(`## Trips: ${trips.filter((x: any) => !x.end_on || x.end_on >= today).map((x: any) => `[${x.id}] ${x.name}${x.destination ? " to " + x.destination : ""} ${x.start_on ?? ""}–${x.end_on ?? ""} (${x.status})`).join("; ") || "none"}`);
  lines.push(`## School to-dos: ${asg.slice(0, 15).map((a: any) => `${a.title} (${a.course?.code ?? a.kind})${a.due_at ? " due " + String(a.due_at).slice(0, 10) : ""}`).join("; ") || "nothing"}`);
  lines.push(`## Drone invoices open: ${invoices.map((i: any) => `${i.number ?? "draft"} ${i.client?.name ?? ""} ${usd(i.amount_cents)} ${i.status}${i.due_on ? " due " + i.due_on : ""}`).join("; ") || "none"}`);
  const savedPlaces = await q(admin.from("locations").select("name, lat").order("name"));
  lines.push(`\n## Saved places: ${savedPlaces.map((l: any) => l.name + (l.lat == null ? " (no location)" : "")).join(", ") || "none"}`);
  lines.push(`\n## Needs clarification (${queue.length}) — kind:ref in brackets`);
  for (const c of queue) lines.push(`- [${c.kind}:${c.ref_id}] ${c.title} — ${c.detail}`);
  if (!queue.length) lines.push("- nothing");
  lines.push(`\n## Uncategorized purchases, last 14 days (id in brackets — use with categorize_transaction)`);
  for (const t of uncat) lines.push(`- [${t.id}] ${t.transaction_date} ${t.merchant || t.description} ${usd(t.amount_cents)}${t.pending ? " pending" : ""}`);
  if (!uncat.length) lines.push("- none");
  lines.push(`\n## Spending categories: ${cats.filter((c: any) => c.category_type === "expense").map((c: any) => c.name).join(", ")}`);
  lines.push(`\n## Today's planned meals`);
  for (const m of todayMeals) lines.push(`- ${m.meal_type}: ${m.recipe?.name ?? m.title}${eaten.some((e: any) => e.meal_plan_item_id === m.id) ? " (logged as eaten)" : ""}`);
  if (!todayMeals.length) lines.push("- nothing planned");
  lines.push(`\n## Meals logged today: ${eaten.length ? eaten.map((e: any) => `${e.meal_type} ${e.title ?? "(planned meal)"} [${e.kind}]`).join("; ") : "none"}`);
  lines.push(`\n## Today's check-in: ${checkin[0] ? `mood ${checkin[0].mood ?? "?"}/5, energy ${checkin[0].energy ?? "?"}/5, highlight: ${checkin[0].highlight ?? "-"}, journal: ${checkin[0].journal ?? "-"}` : "not done yet"}`);
  const plan = plans[0];
  if (plan) {
    lines.push(`\n## Meal plan, week of ${plan.week_start} (grocery budget ${usd(plan.budget_cents)})`);
    const items = (plan.meal_plan_items ?? []).sort((a: any, b: any) => String(a.planned_date).localeCompare(String(b.planned_date)));
    for (const m of items) lines.push(`- ${m.planned_date} ${m.meal_type}: ${m.recipe?.name ?? m.title}${m.leftover_of ? " (leftovers)" : ""}`);
    const groc = await q(admin.from("v_meal_plan_cost").select("est_to_buy_cents, actual_cents").eq("meal_plan_id", plan.id));
    if (groc[0]) lines.push(`- Groceries to buy: about ${usd(groc[0].est_to_buy_cents)} estimated`);
  }
  lines.push(`\n## Activity, last 30 days`);
  for (const d of daily) lines.push(`- ${d.activity_date}: ${d.steps ?? "?"} steps${d.active_energy_kcal != null ? `, ${Math.round(d.active_energy_kcal)} active kcal` : ""}`);
  lines.push(`\n## Recent workouts`);
  for (const w of workouts) lines.push(`- ${localDate(new Date(w.start_time))} ${String(w.activity_type).replace(/_/g, " ")}, ${Math.round((w.duration_seconds || 0) / 60)} min${w.active_energy_kcal ? `, ${Math.round(w.active_energy_kcal)} kcal` : ""}`);
  return lines.join("\n");
}

const CLARIFY = `
# Clarify mode
Samuel tapped "Otto has questions". Work through the "Needs clarification" list in the snapshot, in order, ONE item per message, under 30 words each, offering likely answers:
- transaction:<id> → "Tractor Supply $41.23: which category? Maybe Personal and fun or Car maintenance?" → categorize_transaction (use always=true when he says always/every time).
- place:<visit id> → "You spent 26 min at 451 Essex Street, Swampscott on Sat at 5:29 PM. What is this place?" → name_place with his name for it, or not_a_stop if he says it wasn't a real stop.
- todo:<code> → "'Contact a Salem State advisor' was due Mon. Done, new date, someday, or drop?" → update_todo.
- meal:<plan item id> → "Did you eat the planned <meal>?" → log_meal (or what he ate instead).
- checkin → mood 1–5, energy 1–5, then one highlight → save_checkin.
If he says skip, move on without saving. After acting, ask the next item in the same message ("Done. Next: …"). When the list is finished say "All clear." and nothing more.`;
const SYSTEM = `You are Otto, Samuel's personal assistant inside his own app.
- For anything about Samuel's own life (money, bills, food, todos, health, places), answer ONLY from the data snapshot below, which comes straight from his database. Use exact numbers. If the data doesn't have it, say so plainly; never guess or invent his numbers, merchants, or dates.
- For everything else (general knowledge, how-tos, prices, news, weather, opening hours, anything current), answer like a capable assistant and use web search when the answer could have changed recently or you aren't sure. Prefer official and primary sources.
- You can combine both: e.g. compare his grocery spending with typical prices you look up.
- Be brief and direct, like a sharp friend: usually 1 to 5 sentences. When you used the web, rely on the sources; don't paste long quotes.
- You CAN change his data with the tools: add_todo, update_todo, categorize_transaction, log_meal, save_checkin, log_weight, name_place, not_a_stop, record_grocery_trip, record_receipt, add_record, log_wear, laundry_done. Use them when he asks or clearly implies it ("that was gas", "I had the burrito bowl", "mood was a 4"). Use exact ids/codes from the snapshot. Don't ask permission for clear requests: do it, then say what you did in a few words (every change shows an Undo button). Ask one short question only when it's genuinely ambiguous. Never invent ids. You cannot log cash purchases (ATM withdrawals already count as spending).
- Receipts: he may send several photos at once; handle each receipt separately. Grocery-store food receipts → record_grocery_trip; anything else (clothes, hardware, car parts, restaurants, pharmacy, etc.) → record_receipt with the right kind. If a store sells both (e.g. Target), split food lines into record_grocery_trip and the rest into record_receipt. For a grocery receipt, read every line and call record_grocery_trip once with store, date, total_cents (grand total), and items with clean names, qty and price_cents; frozen items go in the freezer, produce/dairy/meat in the fridge, dry goods in the pantry. Skip bags, deposits and coupons. Then say the total and what changed at home.
- The number of open questions is exactly the N in "Needs clarification (N)". Never count them yourself or add uncategorized purchases to that number.
- Before saying a place isn't saved, check "Saved places". If a tool call fails, say exactly what failed; don't guess what happened.
- Be honest about spending, including when he's over budget, without lecturing.
- Plain text only. No markdown headers or tables; short lists only when they really help.`;

const ACTION_TOOLS = [
  { name: "add_todo", description: "Create a todo for Samuel.", input_schema: { type: "object", properties: {
      title: { type: "string" }, due_date: { type: "string", description: "YYYY-MM-DD, optional" }, priority: { type: "string", enum: ["low", "medium", "high"] },
      project: { type: "string", description: "existing project name, optional" }, notes: { type: "string" } }, required: ["title"] } },
  { name: "update_todo", description: "Finish, drop, reopen, reschedule, or park an existing todo. Prefer the code from the snapshot.", input_schema: { type: "object", properties: {
      code: { type: "string", description: "e.g. TD-00012" }, match: { type: "string", description: "title words, only if no code" },
      status: { type: "string", enum: ["done", "cancelled", "open"] }, due_date: { type: "string", description: "YYYY-MM-DD, or empty string to clear" }, someday: { type: "boolean" } } } },
  { name: "categorize_transaction", description: "Set the spending category of a transaction from the snapshot. always=true also creates a rule for that merchant and fixes its other uncategorized purchases.", input_schema: { type: "object", properties: {
      transaction_id: { type: "integer" }, category: { type: "string", description: "exact category name from the snapshot" }, always: { type: "boolean" } }, required: ["transaction_id", "category"] } },
  { name: "log_meal", description: "Record a meal he ate. If it matches a planned meal that day it's logged against the plan.", input_schema: { type: "object", properties: {
      meal_type: { type: "string", enum: ["breakfast", "lunch", "dinner", "snack"] }, title: { type: "string" }, kind: { type: "string", enum: ["planned", "off_plan", "eating_out"] },
      date: { type: "string", description: "YYYY-MM-DD, default today" } }, required: ["meal_type"] } },
  { name: "save_checkin", description: "Save the daily check-in: mood and energy 1-5, a one-line highlight, and/or journal text (appended).", input_schema: { type: "object", properties: {
      mood: { type: "integer", minimum: 1, maximum: 5 }, energy: { type: "integer", minimum: 1, maximum: 5 }, highlight: { type: "string" }, journal: { type: "string" },
      date: { type: "string", description: "YYYY-MM-DD, default today" } } } },
  { name: "log_weight", description: "Record a weigh-in in pounds.", input_schema: { type: "object", properties: { weight_lb: { type: "number" } }, required: ["weight_lb"] } },
  { name: "name_place", description: "Give an unnamed Timeline stop (place:<visit id> in the clarification list) a name; it becomes a saved place so future visits are recognized. Reuses an existing saved place with the same name.", input_schema: { type: "object", properties: {
      visit_id: { type: "integer" }, name: { type: "string", description: "e.g. Hannah's apartment, Gym, Grandma's house" } }, required: ["visit_id", "name"] } },
  { name: "record_grocery_trip", description: "Record a grocery trip from a pasted or photographed receipt (read every line yourself) or from what he says he bought. Adds items to what's at home, ticks the grocery list, and links the bank charge when the total matches.", input_schema: { type: "object", properties: {
      store: { type: "string" }, date: { type: "string", description: "YYYY-MM-DD, default today" }, total_cents: { type: "integer", description: "receipt grand total incl. tax" }, tax_cents: { type: "integer" },
      items: { type: "array", items: { type: "object", properties: { name: { type: "string", description: "clean product name, e.g. 'Bubba turkey burgers', not the receipt code" }, qty: { type: "number" }, unit: { type: "string" },
        price_cents: { type: "integer" }, section: { type: "string" }, location: { type: "string", enum: ["fridge", "freezer", "pantry", "counter"] }, raw: { type: "string", description: "the original receipt line" } }, required: ["name"] } },
      receipt_text: { type: "string" } }, required: ["items"] } },
  { name: "record_receipt", description: "Save a NON-grocery receipt (clothing, home, car, electronics, dining, health, pets, gifts, office, other): store, date, total, lines. For clothing, set add_to_closet true on each garment (not on socks/underwear unless he asks) with category top/bottom/outerwear/shoes/accessory, color, size. Links the bank charge when the total matches.", input_schema: { type: "object", properties: {
      store: { type: "string" }, date: { type: "string" }, total_cents: { type: "integer" }, tax_cents: { type: "integer" },
      kind: { type: "string", enum: ["clothing", "home", "car", "electronics", "dining", "health", "pets", "gifts", "office", "other"] },
      items: { type: "array", items: { type: "object", properties: { name: { type: "string" }, qty: { type: "number" }, price_cents: { type: "integer" }, raw: { type: "string" },
        add_to_closet: { type: "boolean" }, category: { type: "string" }, color: { type: "string" }, size: { type: "string" }, brand: { type: "string" } }, required: ["name"] } },
      notes: { type: "string" } }, required: ["kind", "items"] } },
  { name: "add_record", description: "Add a row to one of his life areas. Tables: wardrobe_items (name, category, color, brand, size, season, warmth 1-5, wears_before_wash, purchase_price_cents, purchased_on), saved_outfits (name, occasion), subscriptions (name, amount_cents, cadence weekly/monthly/quarterly/yearly, next_charge_on, status), documents (name, kind license/registration/insurance/passport/id/warranty/lease/certificate/medical/other, number_last4 ONLY, issuer, issued_on, expires_on), vehicles, vehicle_services (vehicle_id, service_on, kind oil/tires/brakes/battery/inspection/registration/repair/wash/other, odometer_miles, cost_cents, shop, description, next_due_on, next_due_miles), fuel_logs (vehicle_id, filled_on, gallons, total_cents, odometer_miles, station), people (name, relationship, birthday, how_met, gift_ideas, notes), person_events (person_id, kind, on_date), interactions (person_id, happened_on, kind saw/call/text/gift, notes), trips (name, destination, start_on, end_on, status, budget_cents), trip_items (trip_id, kind flight/lodging/car/activity/reservation/packing/todo/plan, title, starts_at, confirmation, cost_cents), courses (school, code, title, term, credits, status), assignments (course_id, title, kind, due_at), apartment_listings (title, address, rent_cents, beds, baths, url, status, pros, cons), drone_clients (name, contact, email), drone_flights (flown_on, client_id, location_name, aircraft, duration_min, purpose, airspace_auth), drone_invoices (client_id, number, amount_cents, issued_on, due_on, status). Money in cents. Never store a full ID number.", input_schema: { type: "object", properties: {
      table: { type: "string" }, fields: { type: "object" } }, required: ["table", "fields"] } },
  { name: "log_wear", description: "Log clothes he wore (by item names or ids from the closet list). Items reach 'worn' (needs a wash) after their wears_before_wash.", input_schema: { type: "object", properties: {
      names: { type: "array", items: { type: "string" } }, item_ids: { type: "array", items: { type: "integer" } }, date: { type: "string" } } } },
  { name: "laundry_done", description: "Mark laundry done: all worn items clean again (or just item_ids).", input_schema: { type: "object", properties: { item_ids: { type: "array", items: { type: "integer" } } } } },
  { name: "not_a_stop", description: "Remove a Timeline stop that wasn't a real visit (traffic, GPS noise).", input_schema: { type: "object", properties: { visit_id: { type: "integer" } }, required: ["visit_id"] } },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  try {
    await requireOwner(req);
    const key = Deno.env.get("ANTHROPIC_API_KEY");
    if (!key) throw new HttpError(503, "ANTHROPIC_API_KEY is not set in Supabase secrets yet");
    const body = await req.json().catch(() => ({}));
    if (body.undo) {   // the app's Undo button
      const { data: res, error } = await admin.rpc("chat_undo", { p_action_id: Number(body.undo) });
      return json(req, error ? { ok: false, error: error.message } : res);
    }
    const mode = body.mode === "briefing" ? "briefing" : (body.mode === "clarify" || body.mode === "nightly") ? "clarify" : "chat";
    const history = (Array.isArray(body.messages) ? body.messages : [])
      .filter((m: any) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
      .slice(-12).map((m: any) => ({ role: m.role, content: m.content.slice(0, 4000) }));
    const imgs = (Array.isArray(body.images) ? body.images : body.image ? [body.image] : []).filter((x: any) => x && x.data).slice(0, 5);
    if (imgs.length && history.length && history[history.length - 1].role === "user") {
      const last = history[history.length - 1];
      history[history.length - 1] = { role: "user", content: [
        ...imgs.map((im: any) => ({ type: "image", source: { type: "base64", media_type: String(im.media_type || "image/jpeg"), data: String(im.data) } })),
        { type: "text", text: last.content || (imgs.length > 1 ? `Here are ${imgs.length} photos.` : "Here's a photo.") } ] };
    }
    if (mode === "clarify" && !history.length) history.push({ role: "user", content: "What do you need to ask me about?" });
    const messages = mode === "briefing"
      ? [{ role: "user", content: "Write my home-screen briefing for right now: 2 short sentences, at most 40 words. Lead with whatever matters most today (money pace this week, today's meals, anything overdue or due soon). No greeting." }]
      : history;
    if (!messages.length || messages[messages.length - 1].role !== "user") throw new HttpError(400, "Send at least one user message");

    const stream = body.stream === true && mode !== "briefing";
    let emit: (o: any) => void = () => {};
    let finish: (o: any) => Response = (o) => json(req, o);
    let respond: Response | null = null;
    if (stream) {
      const enc = new TextEncoder(); let ctl: ReadableStreamDefaultController<Uint8Array>;
      const rs = new ReadableStream<Uint8Array>({ start(c) { ctl = c; } });
      emit = (o) => { try { ctl.enqueue(enc.encode(JSON.stringify(o) + "\n")); } catch { /* client went away */ } };
      finish = (o) => { emit({ t: "done", ...o }); try { ctl.close(); } catch { /* closed */ } return new Response(null); };
      respond = new Response(rs, { headers: { ...cors(req), "Content-Type": "application/x-ndjson", "Cache-Control": "no-cache" } });
    }
    const work = (async () => {
    emit({ t: "status", s: "Reading your data" });
    const data = await snapshot();
    emit({ t: "status", s: "Thinking" });
    // chat can search the web (Anthropic server-side web search tool); the home briefing stays data-only
    const tools = mode === "briefing" ? undefined : [{ type: "web_search_20250305", name: "web_search", max_uses: 4, user_location: { type: "approximate", city: "Beverly", region: "Massachusetts", country: "US", timezone: TZ } }, ...ACTION_TOOLS];
    const actions: { id: number; summary: string }[] = [];
    let convo: any[] = [...messages], out: any = null, searches = 0;
    const blocks: any[] = [];
    let think = mode !== "briefing";
    for (let turn = 0; turn < 8; turn++) {
      const call = () => fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({ model: MODEL, max_tokens: mode === "briefing" ? 300 : 6000, system: `${SYSTEM}${mode === "clarify" ? CLARIFY : ""}\n\n# Data snapshot\n${data}`, messages: convo, ...(tools ? { tools } : {}),
          ...(think ? { thinking: { type: "enabled", budget_tokens: 1500 } } : {}) }),
      });
      let r = await call(); out = await r.json();
      if (!r.ok && think && /thinking/i.test(out?.error?.message ?? "")) { think = false; r = await call(); out = await r.json(); }   // model without extended thinking: carry on without it
      if (!r.ok) throw new HttpError(502, `AI request failed: ${out?.error?.message ?? r.status}`);
      for (const c of (out.content ?? [])) {
        if (c.type === "thinking" && c.thinking) emit({ t: "think", s: c.thinking });
        if (c.type === "server_tool_use" && c.name === "web_search") emit({ t: "status", s: `Searching the web: “${c.input?.query ?? ""}”` });
        if (c.type === "tool_use") emit({ t: "status", s: ({ record_grocery_trip: "Saving the grocery trip", record_receipt: "Saving the receipt", add_record: "Adding it", log_wear: "Logging what you wore", laundry_done: "Marking laundry done", categorize_transaction: "Categorizing", name_place: "Naming the place", not_a_stop: "Removing the stop", add_todo: "Adding the todo", update_todo: "Updating the todo", log_meal: "Logging the meal", save_checkin: "Saving your check-in", log_weight: "Logging your weight" } as Record<string, string>)[c.name] ?? "Working" });
      }
      blocks.push(...(out.content ?? []));
      searches += (out.content ?? []).filter((c: any) => c.type === "server_tool_use").length;
      if (out.stop_reason === "tool_use") {
        // run each requested change in the database (one atomic step each, with undo recorded)
        const results = [];
        for (const tu of (out.content ?? []).filter((c: any) => c.type === "tool_use")) {
          const { data: res, error } = await admin.rpc("chat_apply", { p_tool: tu.name, p_input: tu.input ?? {} });
          const r = error ? { ok: false, error: error.message } : res;
          if (r?.ok) { actions.push({ id: r.action_id, summary: r.summary }); emit({ t: "action", id: r.action_id, summary: r.summary }); }
          else emit({ t: "status", s: `Couldn't: ${r?.error ?? "unknown error"}` });
          results.push({ type: "tool_result", tool_use_id: tu.id, content: JSON.stringify(r), is_error: !r?.ok });
        }
        convo = [...convo, { role: "assistant", content: out.content }, { role: "user", content: results }];
        continue;
      }
      if (out.stop_reason !== "pause_turn") break;          // long searches can pause; continue the same turn
      convo = [...convo, { role: "assistant", content: out.content }];
    }
    // drop "let me look that up" narration that precedes searches: keep only the text after the last search result
    let lastTool = -1; blocks.forEach((b: any, i: number) => { if (b.type === "web_search_tool_result" || b.type === "server_tool_use" || b.type === "tool_use") lastTool = i; });
    const text = blocks.slice(lastTool + 1).filter((c: any) => c.type === "text").map((c: any) => c.text).join("").trim()
      || blocks.filter((c: any) => c.type === "text").map((c: any) => c.text).join("").trim();
    const seen = new Set<string>(), sources: { url: string; title: string }[] = [];
    for (const b of blocks) for (const c of (b.type === "text" ? (b.citations ?? []) : [])) {
      if (c.url && !seen.has(c.url)) { seen.add(c.url); sources.push({ url: c.url, title: c.title || new URL(c.url).hostname }); }
    }
    const cut = out?.stop_reason === "max_tokens";
    return finish({ text: cut && mode !== "briefing" ? `${text}\n\n(That answer got long and was cut short. Ask me to continue.)` : text, model: MODEL, cut, sources: sources.slice(0, 6), searches, actions });
    })();
    if (respond) { work.catch((e) => finish({ error: errMessage(e) })); return respond; }
    return await work;
  } catch (e) {
    return json(req, { error: errMessage(e) }, errStatus(e));
  }
});
