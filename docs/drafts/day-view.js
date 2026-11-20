// DRAFT, NOT WIRED IN, NOT TESTED: Structured-style day view for Plan › Today (TD-00116), written by Otto A · Screens on Nov 18.
// To ship it: replace the plan-week / planAgenda / planDay markup in #panelTodos with <section id="planDV" class="dv" data-pt="today">,
// make renderPlanWeek() call dvRender() (keep renderPlanNextSteps, planLinksEnsure and the quickAddWhen option update), remove
// renderPlanAgenda / renderPlanDay / wirePlanCalendar / wirePlanWeek, point the planWeekDays check (~line 5745) at #planDV,
// add the dv-/dvw-/dvm- CSS (not written yet), then test with tests/harness.mjs (fixtures already include routine_blocks,
// plan_categories, v_day_plan and scheduled tasks). Depends on the UI module (.105) and migration 20261118_day_plan_palette_ny.

// ================= Day view (.106, TD-00116): a Structured-style plan for the day, week and month =================
// Routine comes from v_day_plan (yesterday … +13 days, New York date) and, outside that window, from routine_blocks
// expanded with the same rules. Tasks come straight from allTodos (scheduled_start), so every change shows at once.
// Colors and icons follow plan_categories. Gestures (shared UI.gestures engine): swipe a task right = Done, left =
// Tomorrow; hold = More; hold and drag = move it in 15-minute steps; hold an Inbox task and drop it on the day to
// schedule it; swipe the week strip for other weeks; pull down at the top to jump back to Today.
const DV_PX = 1.5, DV_MINH = 30, DV_STEP = 15, DV_TOP = 12;
const DV_CATS0 = [{ key:'work', label:'Work', color:'#7B9CFF' }, { key:'exercise', label:'Exercise', color:'#FF7A6B' }, { key:'school', label:'School', color:'#B79BFF' },
  { key:'personal', label:'Personal', color:'#5ED3A0' }, { key:'hannah', label:'Partner', color:'#FF8CC0' }, { key:'errands', label:'Errands & car', color:'#FFA766' },
  { key:'money', label:'Money & admin', color:'#4FD0D0' }, { key:'social', label:'Friends & family', color:'#F2CF5B' }, { key:'meals', label:'Meals', color:'#D2AE8A' },
  { key:'rest', label:'Sleep & downtime', color:'#9AA1B5' }];
const DV_ICON = {
  work:'<rect x="3.5" y="7" width="17" height="12" rx="2"/><path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7"/><path d="M3.5 12.5h17"/>',
  gym:'<path d="M6.5 8v8M17.5 8v8M3.5 10v4M20.5 10v4M6.5 12h11"/>',
  meal:'<path d="M7 3.5v7a2 2 0 0 0 2 2v8"/><path d="M11 3.5v7a2 2 0 0 1-2 2"/><path d="M9 3.5v5"/><path d="M17 20.5V3.5c-2 1-3.2 3.5-3.2 7.5H17"/>',
  sleep:'<path d="M19.5 14.5A7.5 7.5 0 0 1 9.5 4.5a7.5 7.5 0 1 0 10 10z"/>',
  commute:'<path d="M4.5 16.5v-4l2.2-5h10.6l2.2 5v4z"/><path d="M4.5 12.5h15"/><path d="M7 16.5v2M17 16.5v2"/>',
  free:'<circle cx="12" cy="12" r="3.8"/><path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6 6l1.4 1.4M16.6 16.6L18 18M6 18l1.4-1.4M16.6 7.4L18 6"/>',
  routine:'<path d="M5 9.5h11v4.5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z"/><path d="M16 10.5h1.5a2.5 2.5 0 0 1 0 5H16"/><path d="M9 3.5v3M12.5 3.5v3"/>',
  admin:'<rect x="3.5" y="6" width="17" height="12" rx="2.5"/><path d="M3.5 10h17"/><path d="M7 14.5h4"/>',
  errands:'<path d="M5.5 8h13l-1.3 11a2 2 0 0 1-2 1.8H8.8a2 2 0 0 1-2-1.8z"/><path d="M9 8a3 3 0 0 1 6 0"/>',
  social:'<circle cx="9" cy="8.5" r="3"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><circle cx="17" cy="9.5" r="2.4"/><path d="M15.8 14.3A4.5 4.5 0 0 1 20.5 18.5"/>',
  school:'<path d="M2.5 9.5L12 5l9.5 4.5L12 14z"/><path d="M6.5 11.6V16c3 2.4 8 2.4 11 0v-4.4"/>',
  heart:'<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
  task:'<circle cx="12" cy="12" r="8"/><path d="M8.5 12.2l2.4 2.4 4.6-4.8"/>'
};
DV_ICON.chores = DV_ICON.errands;
const DV_CAT_ICON = { work:'work', exercise:'gym', school:'school', personal:'task', hannah:'heart', partner:'heart', errands:'errands', money:'admin', social:'social', meals:'meal', rest:'free' };
const dv = { view:'day', routine:{}, rb:null, rbP:null, month:null, scrolledFor:null, drag:null, pending:false, items:[], catsP:null, catsDone:false, flip:null, timer:0 };
try{ const v = localStorage.getItem('otto.dvview'); if(['day', 'week', 'month'].includes(v)) dv.view = v; }catch(e){}

function dvCats(){ if(!dvCats.v){ try{ const c = JSON.parse(localStorage.getItem('otto.plancats') || 'null'); if(Array.isArray(c) && c.length) dvCats.v = c; }catch(e){} } return dvCats.v || DV_CATS0; }
function dvCat(k){ const c = dvCats(); return c.find(x=>x.key === k) || c.find(x=>x.key === 'personal') || DV_CATS0[3]; }
function dvLoadCats(){
  if(!dv.catsP) dv.catsP = fetch(`${SUPABASE_URL}/rest/v1/plan_categories?select=key,label,color,sort&order=sort.asc`, { headers:authHeaders() })
    .then(r=>r.ok ? r.json() : null).then(c=>{ if(c && c.length){ dvCats.v = c; try{ localStorage.setItem('otto.plancats', JSON.stringify(c)); }catch(e){} } }).catch(()=>{});
  return dv.catsP;
}
const dvSvg = k => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${DV_ICON[k] || DV_ICON.task}</svg>`;
const dvIcon = x => x.task ? (DV_CAT_ICON[x.category] || 'task') : DV_ICON[x.kind] ? x.kind : (DV_CAT_ICON[x.category] || 'routine');

// New York wall time <-> instants (the plan is kept in New York time, like v_day_plan)
const DV_FMT = new Intl.DateTimeFormat('en-CA', { timeZone:'America/New_York', year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', hourCycle:'h23' });
function nyParts(iso){ const o = {}; DV_FMT.formatToParts(new Date(iso)).forEach(p=>{ o[p.type] = p.value; }); return { date:`${o.year}-${o.month}-${o.day}`, min:(Number(o.hour) % 24) * 60 + Number(o.minute) }; }
function nyISO(date, min){
  const [y, m, d] = date.split('-').map(Number), want = Date.UTC(y, m - 1, d) + min * 60000; let t = want;
  for(let i = 0; i < 2; i++){ const p = nyParts(new Date(t).toISOString()), [py, pm, pd] = p.date.split('-').map(Number); t += want - (Date.UTC(py, pm - 1, pd) + p.min * 60000); }
  return new Date(t).toISOString();
}
const dvSel = () => planSelectedDate || localToday();
const dvMonday = d => isoAddDays(d, -((new Date(d + 'T12:00').getDay() + 6) % 7));
const dvNow = () => { const n = new Date(); return n.getHours() * 60 + n.getMinutes(); };
const dvDur = m => { m = Math.round(m); const h = Math.floor(m / 60), r = m % 60; return h ? `${h} h${r ? ` ${r} m` : ''}` : `${r} m`; };
const dvRange = (s, e) => { const a = tclock(s), b = tclock(e); return `${a.slice(-2) === b.slice(-2) ? a.slice(0, -3) : a}–${b}`; };
const dvHHMM = m => `${String(Math.floor(((m % 1440) + 1440) % 1440 / 60)).padStart(2, '0')}:${String(((m % 60) + 60) % 60).padStart(2, '0')}`;
const dvTaskOf = el => (allTodos||[]).find(t=>t.code === el?.dataset.code) || null;

// ---------- data ----------
function dvRoutineBlocks(){
  if(dv.rb) return Promise.resolve(dv.rb);
  if(!dv.rbP) dv.rbP = fetch(`${SUPABASE_URL}/rest/v1/routine_blocks?select=id,title,kind,category,start_time,end_time,days,flexible,active,valid_from,valid_to,skip_dates&active=eq.true`, { headers:authHeaders() })
    .then(r=>r.ok ? r.json() : null).catch(()=>null).then(rows=>{ dv.rbP = null; if(rows) dv.rb = rows; return rows || []; });
  return dv.rbP;
}
function dvExpand(rb, d){
  const dow = ((new Date(d + 'T12:00').getDay() + 6) % 7) + 1;
  return rb.filter(r=>r.active !== false && (r.days || []).includes(dow) && (!r.valid_from || d >= r.valid_from) && (!r.valid_to || d <= r.valid_to) && !(r.skip_dates || []).includes(d))
    .map(r=>({ plan_date:d, start_time:r.start_time, end_time:r.end_time, title:r.title, kind:r.kind, source:'routine', flexible:r.flexible, category:r.category, rb_id:r.id }))
    .sort((a, b)=>a.start_time < b.start_time ? -1 : 1);
}
async function dvLoad(from, to, force){
  const today = localToday(), w0 = isoAddDays(today, -1), w1 = isoAddDays(today, 13), need = [];
  for(let d = from; d <= to; d = isoAddDays(d, 1)) if(force || !dv.routine[d]) need.push(d);
  if(!need.length) return false;
  const inWin = need.filter(d=>d >= w0 && d <= w1), out = need.filter(d=>d < w0 || d > w1), got = {};
  const jobs = [dvRoutineBlocks()];       // ids for "Skip this day", and the routine beyond the view's window
  if(inWin.length) jobs.push(fetch(`${SUPABASE_URL}/rest/v1/v_day_plan?source=eq.routine&plan_date=gte.${inWin[0]}&plan_date=lte.${inWin[inWin.length - 1]}&order=start_time.asc`, { headers:authHeaders() })
    .then(r=>r.ok ? r.json() : Promise.reject(new Error(String(r.status)))).then(rows=>{ inWin.forEach(d=>{ got[d] = []; }); rows.forEach(r=>{ if(got[r.plan_date]) got[r.plan_date].push(r); }); }));
  await Promise.allSettled(jobs);
  inWin.forEach(d=>{ if(got[d]) dv.routine[d] = got[d]; });
  need.forEach(d=>{ if(!got[d] && dv.rb) dv.routine[d] = dvExpand(dv.rb, d); else if(!got[d] && !dv.rb) dv.routine[d] = dv.routine[d] || []; });
  return true;
}
function dvTasksOn(d){
  return (allTodos||[]).filter(t=>t.scheduled_start && t.status !== 'cancelled').map(t=>{
    const a = nyParts(t.scheduled_start); if(a.date !== d) return null;
    const e = t.scheduled_end ? nyParts(t.scheduled_end) : null; let em = e ? (e.date === d ? e.min : 1440) : a.min + 30; if(em <= a.min) em = a.min + 15;
    return { task:true, code:t.code, title:t.title, s:a.min, e:em, category:t.category || 'personal', done:t.status === 'done' };
  }).filter(Boolean);
}
function dvInbox(d){
  const today = localToday();
  return (allTodos||[]).filter(t=>t.status === 'open' && !t.scheduled_start && !t.someday && t.due_date && (t.due_date === d || (d === today && t.due_date < today)))
    .sort((a, b)=>(a.due_date < b.due_date ? -1 : a.due_date > b.due_date ? 1 : 0) || (PRIORITY_ORDER[a.priority] ?? 3) - (PRIORITY_ORDER[b.priority] ?? 3));
}
// routine + tasks for a day: a task trims only the part of a FLEXIBLE block it covers; fixed blocks stay and are marked
function dvItems(d){
  const tasks = dvTasksOn(d), out = [];
  (dv.routine[d] || []).forEach(r=>{
    let s = tmin(r.start_time), e = tmin(r.end_time); const wraps = e <= s; if(wraps) e = 1440;   // sleep: tonight's part; the morning tail is yesterday's
    const base = { title:r.title, kind:r.kind, category:r.category, flexible:!!r.flexible, row:r, wraps, until: wraps ? tmin(r.end_time) : null };
    if(!r.flexible){ out.push({ ...base, s, e, clash: tasks.some(t=>!t.done && t.s < e && t.e > s) }); return; }
    let pieces = [[s, e]];
    tasks.forEach(t=>{ pieces = pieces.flatMap(([a, b])=> t.e <= a || t.s >= b ? [[a, b]] : [[a, Math.min(b, t.s)], [Math.max(a, t.e), b]].filter(([x, y])=>y - x >= 10)); });
    pieces.forEach(([a, b])=>out.push({ ...base, s:a, e:b, trimmed: pieces.length !== 1 || a !== s || b !== e }));
  });
  tasks.forEach(t=>out.push(t));
  return out.sort((a, b)=>a.s - b.s || (a.task ? 1 : -1));
}
// side-by-side lanes for blocks that would overlap on screen (short blocks are drawn at least DV_MINH tall)
function dvLayout(items){
  let start = Math.min(7 * 60, ...items.map(x=>x.s)), end = Math.max(21 * 60, ...items.map(x=>x.e));
  start = Math.floor(start / 60) * 60; end = Math.min(1440, Math.ceil(end / 60) * 60);
  const ve = x => Math.max(x.e, x.s + DV_MINH / DV_PX), sorted = [...items].sort((a, b)=>a.s - b.s || ve(b) - ve(a));
  let cl = [], clEnd = -1; const clusters = [];
  sorted.forEach(x=>{ if(cl.length && x.s >= clEnd){ clusters.push(cl); cl = []; } cl.push(x); clEnd = Math.max(clEnd, ve(x)); });
  if(cl.length) clusters.push(cl);
  clusters.forEach(c=>{ const lanes = []; c.forEach(x=>{ let i = lanes.findIndex(e=>e <= x.s); if(i < 0){ i = lanes.length; lanes.push(0); } lanes[i] = ve(x); x.lane = i; }); c.forEach(x=>{ x.lanes = lanes.length; }); });
  return { start, end };
}
function dvGaps(items, start, end){
  const iv = items.map(x=>[x.s, x.e]).sort((a, b)=>a[0] - b[0]), gaps = []; if(!iv.length) return gaps;
  let cur = iv[0][1];
  iv.slice(1).forEach(([s, e])=>{ if(s - cur >= 30) gaps.push({ s:cur, e:s }); cur = Math.max(cur, e); });
  return gaps.filter(g=>g.s >= start && g.e <= end);
}
function dvSuggest(d){   // next free quarter hour (now, on today; else 9 AM), skipping fixed blocks and tasks
  const busy = dvItems(d).filter(x=>x.task || !x.flexible).map(x=>[x.s, x.e]);
  let m = d === localToday() ? Math.ceil((dvNow() + 5) / DV_STEP) * DV_STEP : 9 * 60;
  for(let i = 0; i < 96 && busy.some(([s, e])=>m < e && m + 30 > s); i++) m += DV_STEP;
  return Math.min(m, 23 * 60);
}

// ---------- render ----------
function dvRender(){
  const host = document.getElementById('planDV'); if(!host) return;
  if(UI.busy || dv.drag){ dv.pending = true; return; }
  dv.pending = false; dvWire(host);
  if(!dv.catsDone){ dv.catsDone = true; dvLoadCats().then(()=>dvRender()); }
  const d = dvSel(), wk = dvMonday(d);
  const [from, to] = dv.view === 'month' ? [null, null] : [isoAddDays(wk, -7), isoAddDays(wk, 13)];
  if(from){ let missing = false; for(let x = wk; x <= isoAddDays(wk, 6); x = isoAddDays(x, 1)) if(!dv.routine[x]) missing = true;
    if(missing || !dv.routine[from] || !dv.routine[to]) dvLoad(from, to).then(ch=>{ if(ch) dvRender(); }); }
  const flip = dv.flip; dv.flip = null;
  const focusSel = host.contains(document.activeElement) && document.activeElement.matches('[data-dv-date], [data-dv-view], [data-dv-month], [data-dv-today]') ? document.activeElement.getAttribute('data-dv-date') || document.activeElement.getAttribute('data-dv-view') || document.activeElement.getAttribute('data-dv-month') || 'today' : null;
  host.dataset.view = dv.view;
  host.innerHTML = `<div class="dv-pull" aria-hidden="true">↓ Today</div><div class="dv-top">${dvHeader(d)}${dvStrip(wk, d)}</div>`
    + (dv.view === 'day' ? dvDayBody(d) : dv.view === 'week' ? dvWeekBody(wk) : dvMonthBody());
  if(focusSel){ const f = host.querySelector(`[data-dv-date="${focusSel}"], [data-dv-view="${focusSel}"], [data-dv-month="${focusSel}"]`) || (focusSel === 'today' ? host.querySelector('[data-dv-today]') : null); if(f) f.focus({ preventScroll:true }); }
  if(flip) dvPlayFlip(host, flip);
  dvAfterRender(host, d);
}
function dvHeader(d){
  const today = localToday(), dt = new Date(d + 'T12:00');
  const title = dv.view === 'month' ? new Date((dv.month || d.slice(0, 7)) + '-01T12:00').toLocaleDateString('en-US', { month:'long' })
    : d === today ? 'Today' : d === isoAddDays(today, 1) ? 'Tomorrow' : d === isoAddDays(today, -1) ? 'Yesterday' : dt.toLocaleDateString('en-US', { weekday:'long' });
  const sub = dv.view === 'month' ? new Date((dv.month || d.slice(0, 7)) + '-01T12:00').getFullYear()
    : dt.toLocaleDateString('en-US', { weekday: d === today || Math.abs(new Date(d) - new Date(today)) <= 86400000 ? 'long' : undefined, month:'long', day:'numeric' }) + (dt.getFullYear() !== new Date().getFullYear() ? `, ${dt.getFullYear()}` : '');
  const off = dv.view === 'month' ? (dv.month || d.slice(0, 7)) !== today.slice(0, 7) : d !== today;
  return `<div class="dv-head"><div class="dv-title"><h3>${esc(title)}</h3><span>${esc(String(sub))}</span></div>
    ${off ? `<button type="button" class="dv-today o-press" data-dv-today>Today</button>` : ''}
    <div class="dv-seg" role="group" aria-label="Calendar view">${['day', 'week', 'month'].map(v=>`<button type="button" class="o-press" aria-pressed="${dv.view === v}" data-dv-view="${v}">${v[0].toUpperCase() + v.slice(1)}</button>`).join('')}</div></div>`;
}
function dvStrip(wk, d){
  if(dv.view === 'month') return '';
  const pane = w => `<div class="dv-pane"${w === wk ? '' : ' aria-hidden="true" inert'}>${Array.from({ length:7 }, (_, i)=>dvDayBtn(isoAddDays(w, i), d, w === wk)).join('')}</div>`;
  return `<div class="dv-strip" role="group" aria-label="Week of ${esc(shortDate(wk))}. Swipe for other weeks; arrow keys move the day."><div class="dv-track">${pane(isoAddDays(wk, -7))}${pane(wk)}${pane(isoAddDays(wk, 7))}</div></div>`;
}
function dvDots(x){
  const tasks = dvTasksOn(x).filter(t=>!t.done), inb = dvInbox(x).length, cats = [...new Set(tasks.map(t=>t.category))].slice(0, 3);
  return { n: tasks.length + inb, html: cats.map(c=>`<i style="background:${dvCat(c).color}"></i>`).join('') + (inb && cats.length < 3 ? '<i class="inb"></i>' : '') };
}
function dvDayBtn(x, d, live){
  const today = localToday(), dt = new Date(x + 'T12:00'), dots = dvDots(x);
  return `<button type="button" class="dv-day o-press${x === d ? ' sel' : ''}${x === today ? ' today' : ''}${x < today ? ' past' : ''}" data-dv-date="${x}"${live ? '' : ' tabindex="-1"'} aria-pressed="${x === d}" aria-label="${dt.toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' })}${x === today ? ', today' : ''}${dots.n ? `, ${dots.n} task${dots.n === 1 ? '' : 's'}` : ''}"><span class="w" aria-hidden="true">${dt.toLocaleDateString('en-US', { weekday:'narrow' })}</span><span class="n" aria-hidden="true">${dt.getDate()}</span><span class="dots" aria-hidden="true">${dots.html}</span></button>`;
}
function dvDayBody(d){
  if(!dv.routine[d]) return `<div class="dv-loading" aria-busy="true" aria-label="Loading the day"><div class="skeleton"><div class="skeleton-row"></div><div class="skeleton-row"></div><div class="skeleton-row"></div></div></div>`;
  const today = localToday(), isT = d === today, items = dvItems(d), inbox = dvInbox(d);
  const all = planItemsFor(d).filter(x=>x.kind !== 'todo');
  dv.items = items;
  const allDay = all.length ? `<div class="dv-allday" role="group" aria-label="All day">${all.map(it=>{
      const dest = it.proj ? `data-coderef="${esc(it.proj)}"` : it.area ? `data-dv-area="${esc(it.area)}"` : it.kind === 'meal' ? 'data-dv-area="food"' : it.kind === 'bill' ? 'data-dv-area="money"' : '';
      const inner = `<i style="background:${(PLAN_KIND[it.kind] || ['', '#9AA1B5'])[1]}" aria-hidden="true"></i><span><b>${esc(it.title)}</b><em>${esc(it.time)}</em></span>`;
      return dest ? `<button type="button" class="dv-ad o-press${it.late ? ' late' : ''}" ${dest}>${inner}</button>` : `<div class="dv-ad${it.late ? ' late' : ''}">${inner}</div>`; }).join('')}</div>` : '';
  const inboxHtml = `<div class="dv-inbox" role="group" aria-label="Inbox: ${inbox.length} task${inbox.length === 1 ? '' : 's'} without a time"><span class="dv-inbox-l" aria-hidden="true">${UI.icon('inbox')}Inbox${inbox.length ? ` <b>${inbox.length}</b>` : ''}</span>
    <div class="dv-rail">${inbox.map(t=>`<button type="button" class="dv-inb o-press o-gest${t.due_date < today ? ' late' : ''}" data-dv-inb="${esc(t.code)}" style="--cat:${dvCat(t.category || 'personal').color}" aria-label="${esc(t.title)}${t.due_date < today ? ', overdue' : ''}. Pick a time, or hold and drag it onto the day."><i aria-hidden="true"></i><span class="t">${esc(t.title)}</span></button>`).join('')}${inbox.length ? '' : '<span class="dv-inb-empty">Nothing waiting</span>'}<button type="button" class="dv-inb add o-press" data-dv-new aria-label="New task">${UI.icon('add')}</button></div></div>`;
  const { start, end } = dvLayout(items), y = m => Math.round((m - start) * DV_PX) + DV_TOP;
  const hours = []; for(let m = start; m <= end; m += 60) hours.push(`<div class="dv-hr" style="top:${y(m)}px"><span>${tclock(m % 1440).replace(':00', '')}</span></div>`);
  const nowM = isT ? dvNow() : null;
  const gaps = dvGaps(items, start, end).map(g=>`<button type="button" class="dv-gap o-press" data-dv-gap="${g.s}" style="top:${y(g.s) + 2}px;height:${Math.max(DV_MINH, (g.e - g.s) * DV_PX - 4)}px" aria-label="Free from ${tclock(g.s)} for ${dvDur(g.e - g.s)}. Add a task."><span>${UI.icon('add')}Free · ${dvDur(g.e - g.s)}</span></button>`).join('');
  const blocks = items.map((x, i)=>dvBlock(x, i, y, nowM)).join('');
  const now = isT && nowM >= start && nowM <= end ? `<div class="dv-now" style="top:${y(nowM)}px" aria-hidden="true"><span>${tclock(nowM).slice(0, -3)}</span></div>` : '';
  return allDay + inboxHtml + `<div class="dv-tl" style="height:${y(end) + 16}px" data-start="${start}" data-end="${end}" data-date="${d}">${hours.join('')}<i class="dv-line" aria-hidden="true"></i>${gaps}${blocks}${now}</div>`
    + (items.length ? '' : UI.empty('No routine for this day yet.', 'Add a task', 'data-dv-new'));
}
function dvBlock(x, i, y, nowM){
  const h = Math.max(DV_MINH, Math.round((x.e - x.s) * DV_PX) - 2), short = h < 46;
  const past = nowM != null && x.e <= nowM, cur = nowM != null && nowM >= x.s && nowM < x.e;
  const cls = ['dv-blk', 'o-gest', x.task ? 'task' : x.flexible ? 'flex' : 'fixed', x.done ? 'done' : '', past ? 'past' : '', cur ? 'cur' : '', short ? 'short' : ''].filter(Boolean).join(' ');
  const time = x.wraps ? `${tclock(x.s)} · until ${tclock(x.until)}` : `${dvRange(x.s, x.e)}${short ? '' : ` · ${dvDur(x.e - x.s)}`}`;
  const note = x.task ? '' : x.clash ? 'overlaps a task' : x.trimmed ? 'shortened for a task' : '';
  const label = `${x.title}, ${tclock(x.s)} to ${tclock(x.wraps ? x.until : x.e)}${x.task ? (x.done ? ', task, done' : ', task') : x.flexible ? ', flexible' : ''}${note ? ', ' + note : ''}. Open.`;
  return `<div class="${cls}" ${x.task ? `data-code="${esc(x.code)}"` : ''} data-s="${x.s}" data-e="${x.e}" style="top:${y(x.s) + 1}px;height:${h}px;--cat:${dvCat(x.category).color};--lane:${x.lane || 0};--lanes:${x.lanes || 1}">
    <button type="button" class="dv-hit" data-dv-i="${i}" aria-label="${esc(label)}"></button>
    <span class="dv-pill" aria-hidden="true">${dvSvg(dvIcon(x))}</span>
    <span class="dv-txt" aria-hidden="true"><b>${esc(x.title)}</b><em>${esc(time)}${note ? ` · <span class="warn">${esc(note)}</span>` : ''}</em></span>
    ${x.task ? UI.check(x.done, x.done ? `Mark “${x.title}” not done` : `Mark “${x.title}” done`, `data-dv-check="${esc(x.code)}"`) : ''}</div>`;
}
function dvWeekBody(wk){
  const days = Array.from({ length:7 }, (_, i)=>isoAddDays(wk, i));
  if(days.some(x=>!dv.routine[x])) return `<div class="dv-loading" aria-busy="true" aria-label="Loading the week"><div class="skeleton"><div class="skeleton-row"></div><div class="skeleton-row"></div></div></div>`;
  const S = 6 * 60, E = 24 * 60, PX = 0.62, today = localToday(), sel = dvSel(), nowM = dvNow(), used = new Set();
  const hours = [6, 9, 12, 15, 18, 21].map(hh=>`<div class="dvw-hr" style="top:${(hh * 60 - S) * PX}px"><span>${tclock(hh * 60).replace(':00', '').replace(' ', '')}</span></div>`).join('');
  const cols = days.map(x=>{
    const items = dvItems(x).filter(it=>it.e > S && it.s < E), open = items.filter(it=>it.task && !it.done);
    items.forEach(it=>used.add(it.category));
    const bars = items.map(it=>{ const s = Math.max(S, it.s), e = Math.min(E, it.e); return `<i class="${it.task ? 'task' : it.flexible ? 'flex' : 'fixed'}${it.done ? ' done' : ''}" style="top:${Math.round((s - S) * PX)}px;height:${Math.max(4, Math.round((e - s) * PX) - 1)}px;--cat:${dvCat(it.category).color}"></i>`; }).join('');
    const dt = new Date(x + 'T12:00');
    return `<button type="button" class="dvw-col o-press${x === today ? ' today' : ''}${x === sel ? ' sel' : ''}" data-dv-open="${x}" aria-label="${dt.toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' })}: ${open.length ? `${open.length} task${open.length === 1 ? '' : 's'}` : 'no tasks'}. Open the day.">${bars}${x === today && nowM >= S ? `<b class="dvw-now" style="top:${Math.round((nowM - S) * PX)}px" aria-hidden="true"></b>` : ''}</button>`;
  }).join('');
  const legend = dvCats().filter(c=>used.has(c.key)).map(c=>`<span><i style="background:${c.color}"></i>${esc(c.label)}</span>`).join('');
  return `<div class="dvw" style="--h:${Math.round((E - S) * PX)}px"><div class="dvw-hrs" aria-hidden="true">${hours}</div><div class="dvw-cols">${cols}</div></div>
    <div class="dvw-legend" aria-label="Colors">${legend}<span><i class="flex"></i>Flexible</span><span><i class="task"></i>Task</span></div>`;
}
function dvMonthBody(){
  const m = dv.month || dvSel().slice(0, 7), first = m + '-01', start = dvMonday(first), today = localToday(), sel = dvSel(), weeks = [];
  for(let i = 0; i < 6; i++){ const w = Array.from({ length:7 }, (_, k)=>isoAddDays(start, i * 7 + k)); if(i > 3 && w[0].slice(0, 7) !== m) break; weeks.push(w); }
  const cells = weeks.flat().map(x=>{
    const dt = new Date(x + 'T12:00'), dots = dvDots(x), ad = planItemsFor(x).filter(it=>it.kind !== 'todo' && it.kind !== 'meal').length;
    return `<button type="button" class="dvm-day o-press${x.slice(0, 7) !== m ? ' out' : ''}${x === today ? ' today' : ''}${x === sel ? ' sel' : ''}" data-dv-open="${x}" aria-label="${dt.toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' })}${x === today ? ', today' : ''}${dots.n ? `, ${dots.n} task${dots.n === 1 ? '' : 's'}` : ''}${ad ? `, ${ad} dated item${ad === 1 ? '' : 's'}` : ''}"><span class="n" aria-hidden="true">${dt.getDate()}</span><span class="dots" aria-hidden="true">${dots.html}${ad ? '<i class="ad"></i>' : ''}</span></button>`; }).join('');
  return `<div class="dvm"><div class="dvm-nav"><button type="button" class="o-x o-press" data-dv-month="-1" aria-label="Previous month">‹</button><b>${new Date(first + 'T12:00').toLocaleDateString('en-US', { month:'long', year:'numeric' })}</b><button type="button" class="o-x o-press" data-dv-month="1" aria-label="Next month">›</button></div>
    <div class="dvm-wd" aria-hidden="true">${['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(w=>`<span>${w}</span>`).join('')}</div><div class="dvm-grid">${cells}</div>
    <div class="dvw-legend"><span><i class="dot"></i>Task colors by category</span><span><i class="inb"></i>Due, no time yet</span><span><i class="ad"></i>Bill, birthday or deadline</span></div></div>`;
}
function dvScroller(el){
  for(let p = el && el.parentElement; p; p = p.parentElement){ const s = getComputedStyle(p); if(/(auto|scroll)/.test(s.overflowY) && p.scrollHeight > p.clientHeight + 1) return p; }
  return document.scrollingElement;
}
function dvAfterRender(host, d){
  if(dv.view !== 'day' || dv.scrolledFor === d || !dv.routine[d]) return;
  dv.scrolledFor = d;
  requestAnimationFrame(()=>{
    const sc = dvScroller(host), top = host.querySelector('.dv-top'); if(!sc || !top) return;
    const target = host.querySelector('.dv-now') || host.querySelector('.dv-blk:not(.past)') || host.querySelector('.dv-blk'); if(!target) return;
    const below = top.getBoundingClientRect().bottom, vh = sc === document.scrollingElement ? innerHeight : sc.getBoundingClientRect().bottom;
    const want = target.getBoundingClientRect().top - (below + (vh - below) * 0.28);
    if(want > 4) sc.scrollTo({ top: sc.scrollTop + want, behavior: UI.reduced() ? 'auto' : 'smooth' });
  });
}
// FLIP: blocks whose time changed glide from where they were to where they are now
function dvRects(){ const m = {}; document.querySelectorAll('#planDV .dv-blk[data-code]').forEach(b=>{ m[b.dataset.code] = b.getBoundingClientRect(); }); return m; }
function dvPlayFlip(host, from){
  if(UI.reduced()) return;
  host.querySelectorAll('.dv-blk[data-code]').forEach(b=>{ const r0 = from[b.dataset.code]; if(!r0) return; const r1 = b.getBoundingClientRect(), dy = r0.top - r1.top, dx = r0.left - r1.left;
    if(Math.abs(dy) < 1 && Math.abs(dx) < 1) return;
    try{ b.animate([{ transform:`translate(${dx}px, ${dy}px)` }, { transform:'none' }], { duration:450, easing:getComputedStyle(document.documentElement).getPropertyValue('--ease-spring').trim() || 'ease-out' }); }catch(e){} });
}
function dvTick(){
  const tl = document.querySelector('#planDV .dv-tl'), today = localToday();
  if(dv.today && dv.today !== today){ dv.today = today; dv.scrolledFor = null; dvRender(); return; } dv.today = today;
  if(!tl || tl.dataset.date !== today || UI.busy || dv.drag) return;
  const m = dvNow(), start = Number(tl.dataset.start), now = tl.querySelector('.dv-now');
  if(now){ now.style.top = `${Math.round((m - start) * DV_PX) + DV_TOP}px`; now.querySelector('span').textContent = tclock(m).slice(0, -3); }
  tl.querySelectorAll('.dv-blk').forEach(b=>{ const s = Number(b.dataset.s), e = Number(b.dataset.e); b.classList.toggle('past', e <= m); b.classList.toggle('cur', m >= s && m < e); });
}

// ---------- navigation ----------
function dvGo(d, { view } = {}){
  if(view) dvSetView(view, true);
  planSelectedDate = d === localToday() ? null : d;
  if(dv.view === 'month') dv.month = d.slice(0, 7);
  renderPlanWeek(allTodos);
  const qa = document.getElementById('quickAddWhen'); if(qa && !qa.matches(':focus')) qa.value = planSelectedDate ? 'selected' : 'today';
}
function dvSetView(v, quiet){
  dv.view = v; try{ localStorage.setItem('otto.dvview', v); }catch(e){}
  if(v === 'month') dv.month = dvSel().slice(0, 7);
  if(v === 'day') dv.scrolledFor = null;
  if(!quiet) dvRender();
}

// ---------- sheets ----------
function dvTaskForm({ code = null, title = '', date, start, dur = 30, cat = 'personal', has = false, done = false, from = null }){
  const durs = [15, 30, 45, 60, 90, 120]; if(!durs.includes(dur)) durs.push(dur), durs.sort((a, b)=>a - b);
  const html = `<form class="dv-form" novalidate>
    <label class="o-field"><span>Task</span><input name="title" value="${esc(title)}" required autocomplete="off" enterkeyhint="done" placeholder="What needs doing?"></label>
    <div class="o-split"><label class="o-field"><span>Day</span><input type="date" name="date" value="${esc(date)}" required></label><label class="o-field"><span>Starts</span><input type="time" name="start" step="300" value="${dvHHMM(start)}" required></label></div>
    <div class="o-field"><span id="dvDurL">How long</span><div class="o-chips" role="radiogroup" aria-labelledby="dvDurL">${durs.map(m=>UI.chip(dvDur(m), { role:'radio', pressed:m === dur, attrs:`data-dur="${m}"` })).join('')}</div></div>
    <div class="o-field"><span id="dvCatL">Category</span><div class="o-chips" role="radiogroup" aria-labelledby="dvCatL">${dvCats().map(c=>UI.chip(c.label, { role:'radio', pressed:c.key === cat, dot:c.color, attrs:`data-cat="${esc(c.key)}"` })).join('')}</div></div>
    <button type="submit" class="o-btn primary wide o-press">${code ? (has ? 'Save' : 'Schedule') : 'Add task'}</button>
    ${code ? `<div class="dv-form-alt">${done ? `<button type="button" class="o-btn o-press" data-act="reopen">${UI.icon('reopen')}Reopen</button>` : `<button type="button" class="o-btn o-press" data-act="done">${UI.icon('done')}Mark done</button>`}${has ? `<button type="button" class="o-btn o-press" data-act="inbox">${UI.icon('inbox')}Back to Inbox</button>` : ''}<button type="button" class="o-btn quiet o-press" data-act="more">More</button></div>` : ''}
  </form>`;
  const s = UI.sheet({ title: code ? 'Task' : 'New task', html, size:'fit', from });
  const form = s.body.querySelector('form');
  form.addEventListener('click', e=>{
    const r = e.target.closest('[role="radio"]'); if(r){ r.parentElement.querySelectorAll('[role="radio"]').forEach(b=>b.setAttribute('aria-checked', String(b === r))); return; }
    const a = e.target.closest('[data-act]'); if(!a) return; s.close();
    setTimeout(()=>{ if(a.dataset.act === 'done') completeTodoWithUndo(code); else if(a.dataset.act === 'reopen') patchTodo(code, { status:'open', completed_at:null });
      else if(a.dataset.act === 'inbox') dvUnschedule(code); else if(a.dataset.act === 'more') todoMore(code, { onEdit:()=>dvScheduleSheet(code) }); }, 80);
  });
  form.addEventListener('keydown', e=>{ const r = e.target.closest('[role="radio"]'); if(!r || !/^Arrow(Left|Right|Up|Down)$/.test(e.key)) return; e.preventDefault();
    const all = [...r.parentElement.querySelectorAll('[role="radio"]')], i = all.indexOf(r), n = all[(i + (/Left|Up/.test(e.key) ? -1 : 1) + all.length) % all.length]; n.click(); n.focus(); });
  form.addEventListener('submit', async e=>{
    e.preventDefault(); const f = new FormData(form), t = String(f.get('title') || '').trim();
    if(!t){ const i = form.querySelector('[name="title"]'); i.setAttribute('aria-invalid', 'true'); i.focus(); return; }
    const day = String(f.get('date') || dvSel()), [hh, mm] = String(f.get('start') || '09:00').split(':').map(Number), st = hh * 60 + (mm || 0);
    const len = Number(form.querySelector('[data-dur][aria-checked="true"]')?.dataset.dur || 30), c = form.querySelector('[data-cat][aria-checked="true"]')?.dataset.cat || 'personal';
    const body = { title:t, scheduled_start:nyISO(day, st), scheduled_end:nyISO(day, st + len), due_date:day, category:c };
    s.close();
    if(code){ const old = allTodos.find(x=>x.code === code); if(!old) return; const before = { title:old.title, scheduled_start:old.scheduled_start, scheduled_end:old.scheduled_end, due_date:old.due_date, category:old.category };
      dv.flip = dvRects(); if(day !== dvSel()) planSelectedDate = day === localToday() ? null : day;
      await patchTodo(code, body); UI.toast(has ? `Moved to ${tclock(st)}${day !== localToday() ? ` · ${shortDate(day)}` : ''}` : `Scheduled for ${tclock(st)}`, { action:'Undo', onAction:()=>patchTodo(code, before) }); }
    else dvCreate(body);
  });
  return s;
}
function dvScheduleSheet(code, { from = null } = {}){
  const t = (allTodos||[]).find(x=>x.code === code); if(!t) return;
  const has = !!t.scheduled_start, p = has ? nyParts(t.scheduled_start) : null, date = p ? p.date : (t.due_date && t.due_date >= localToday() ? t.due_date : dvSel());
  const dur = has && t.scheduled_end ? Math.max(5, Math.round((new Date(t.scheduled_end) - new Date(t.scheduled_start)) / 60000)) : 30;
  return dvTaskForm({ code, title:t.title, date, start: p ? p.min : dvSuggest(date), dur, cat:t.category || 'personal', has, done:t.status === 'done', from });
}
function dvNewTask(date, min){ return dvTaskForm({ date, start: min ?? dvSuggest(date) }); }
async function dvCreate(body){
  try{
    const code = await nextCodeFor('todos', 'TD');
    const res = await fetch(`${SUPABASE_URL}/rest/v1/todos`, { method:'POST', headers:authHeaders({ 'Content-Type':'application/json', Prefer:'return=representation' }), body:JSON.stringify([{ code, status:'open', ...body }]) });
    if(!res.ok){ const e = await res.json().catch(()=>({})); throw new Error(e.message || `Supabase returned ${res.status}`); }
    const [row] = await res.json().catch(()=>[]); if(row && !allTodos.some(x=>x.code === row.code)){ allTodos.push({ project:null, asset:null, ...row }); renderAll(allTodos); }
    UI.toast(`Added “${body.title.length > 28 ? body.title.slice(0, 26).trimEnd() + '…' : body.title}” at ${tclock(nyParts(body.scheduled_start).min)}`);
    refresh(false);
  }catch(err){ showNotice(`Couldn't add the task (${err.message}).`); }
}
function dvUnschedule(code){
  const t = (allTodos||[]).find(x=>x.code === code); if(!t) return; const before = { scheduled_start:t.scheduled_start, scheduled_end:t.scheduled_end };
  patchTodo(code, { scheduled_start:null, scheduled_end:null }); UI.toast('Back in the Inbox', { action:'Undo', onAction:()=>patchTodo(code, before) });
}
function dvRoutineSheet(x, from){
  const c = dvCat(x.category), d = dvSel();
  const html = `<div class="dv-detail" style="--cat:${c.color}"><span class="dv-pill big${x.flexible ? ' flex' : ''}" aria-hidden="true">${dvSvg(dvIcon(x))}</span><div><span class="dv-when">${esc(x.wraps ? `${tclock(x.s)} until ${tclock(x.until)}` : `${dvRange(x.s, x.e)} · ${dvDur(x.e - x.s)}`)}</span><span class="dv-catchip"><i aria-hidden="true"></i>${esc(c.label)}</span></div></div>
    <p class="dv-note">${x.flexible ? 'Flexible: tasks can take this time, and the rest of the block stays.' : 'Fixed: a task scheduled on top of it shows as overlapping.'}${x.trimmed ? ' Part of it is taken by a task.' : ''} Repeats every week.</p>
    <div class="dv-form-alt"><button type="button" class="o-btn primary o-press" data-act="add">${UI.icon('add')}Add a task here</button><button type="button" class="o-btn o-press" data-act="skip">${UI.icon('skip')}Skip on ${esc(shortDate(d))}</button></div>`;
  const s = UI.sheet({ title:x.title, html, size:'fit', from });
  s.body.addEventListener('click', e=>{ const a = e.target.closest('[data-act]'); if(!a) return; s.close();
    setTimeout(()=>{ if(a.dataset.act === 'add') dvNewTask(d, x.s); else dvSkip(x, d); }, 80); });
}
async function dvSkip(x, d){
  await dvRoutineBlocks();
  const r0 = x.row || {}, rb = (dv.rb || []).find(r=>r.id === r0.rb_id) || (dv.rb || []).find(r=>r.title === r0.title && r.start_time === r0.start_time && r.end_time === r0.end_time);
  if(!rb){ showNotice("Couldn't find that routine block."); return; }
  const before = rb.skip_dates || [], after = [...new Set([...before, d])];
  const save = async v => {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/routine_blocks?id=eq.${rb.id}`, { method:'PATCH', headers:authHeaders({ 'Content-Type':'application/json', Prefer:'return=minimal' }), body:JSON.stringify({ skip_dates:v }) });
    if(!r.ok) throw new Error(`Supabase returned ${r.status}`);
    rb.skip_dates = v; delete dv.routine[d]; await dvLoad(d, d, true); dvRender();
  };
  try{ await save(after); UI.toast(`Skipped ${x.title} on ${shortDate(d)}`, { action:'Undo', onAction:()=>save(before).catch(e=>showNotice(e.message)) }); }
  catch(e){ showNotice(`Couldn't skip it (${e.message}).`); }
}
function dvOpenBlock(blk){
  const hit = blk && blk.querySelector('.dv-hit'), x = hit ? dv.items[Number(hit.dataset.dvI)] : null; if(!x) return;
  if(x.task) dvScheduleSheet(x.code, { from:blk }); else dvRoutineSheet(x, blk);
}
function dvBlockMore(blk){
  const hit = blk && blk.querySelector('.dv-hit'), x = hit ? dv.items[Number(hit.dataset.dvI)] : null; if(!x) return;
  if(x.task) return todoMore(x.code, { onEdit:()=>dvScheduleSheet(x.code) });
  const d = dvSel();
  UI.more([{ key:'add', label:'Add a task here', icon:'add', run:()=>dvNewTask(d, x.s) }, { key:'skip', label:`Skip on ${shortDate(d)}`, icon:'skip', run:()=>dvSkip(x, d) }, { key:'edit', label:'Details', run:()=>dvRoutineSheet(x) }], { title:x.title });
}
function dvCheck(btn){
  const code = btn.dataset.dvCheck, t = (allTodos||[]).find(x=>x.code === code); if(!t) return;
  const on = t.status !== 'done'; btn.setAttribute('aria-checked', String(on)); btn.closest('.dv-blk')?.classList.toggle('done', on);
  setTimeout(()=>{ if(on) completeTodoWithUndo(code); else patchTodo(code, { status:'open', completed_at:null }); }, UI.reduced() ? 0 : 420);
}

// ---------- drag: move a task (lift), drop an Inbox task on the day ----------
function dvTlGeo(){ const tl = document.querySelector('#planDV .dv-tl'); if(!tl) return null; return { tl, r:tl.getBoundingClientRect(), start:Number(tl.dataset.start), end:Number(tl.dataset.end), date:tl.dataset.date }; }
const dvClamp = (v, a, b) => Math.max(a, Math.min(b, v));
function dvMarker(geo, m, text){
  let mk = geo.tl.querySelector('.dv-drop'); if(!mk){ mk = document.createElement('div'); mk.className = 'dv-drop'; mk.setAttribute('aria-hidden', 'true'); mk.innerHTML = '<span></span>'; geo.tl.appendChild(mk); }
  mk.style.top = `${Math.round((m - geo.start) * DV_PX) + DV_TOP}px`; mk.firstChild.textContent = text; return mk;
}
function dvAutoScroll(){
  const host = document.getElementById('planDV'), sc = dvScroller(host);
  const tick = () => { const it = dv.drag; if(!it || !it.g) return;
    const top = (host.querySelector('.dv-top')?.getBoundingClientRect().bottom || 0) + 40, bottom = innerHeight - 130, y = it.g.y;
    const v = y < top ? -Math.min(16, (top - y) / 5) : y > bottom ? Math.min(16, (y - bottom) / 5) : 0;
    if(v){ sc.scrollTop += v; it.move(it.g); } requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
}
const dvLift = {
  can: el => { const t = dvTaskOf(el); return !!t && t.status === 'open'; },
  start(g){ const t = dvTaskOf(g.el), geo = dvTlGeo(); if(!t || !geo) return;
    const s0 = Number(g.el.dataset.s), e0 = Number(g.el.dataset.e);
    dv.drag = { g, code:t.code, s0, dur:e0 - s0, grab:g.y0 - g.el.getBoundingClientRect().top, m:s0, el:g.el, em:g.el.querySelector('.dv-txt em'), move:dvLift.move };
    g.el.style.transition = 'none'; g.el.style.transform = 'scale(var(--lift-scale))'; dvAutoScroll(); },
  move(g){ const it = dv.drag, geo = dvTlGeo(); if(!it || !geo) return; it.g = g;
    const raw = geo.start + (g.y - it.grab - geo.r.top - DV_TOP) / DV_PX, m = dvClamp(Math.round(raw / DV_STEP) * DV_STEP, geo.start, Math.max(geo.start, geo.end - it.dur));
    it.el.style.transform = `translateY(${Math.round((m - it.s0) * DV_PX)}px) scale(var(--lift-scale))`;
    if(m !== it.m){ it.m = m; hapticPulse(); if(it.em) it.em.textContent = `${dvRange(m, m + it.dur)} · drop to move`; } },
  end(g){ const it = dv.drag; dv.drag = null; if(!it) return; const geo = dvTlGeo();
    if(!geo || it.m === it.s0){ it.el.style.transform = ''; it.el.style.transition = ''; if(dv.pending) dvRender(); else dvRender(); return; }
    const t = allTodos.find(x=>x.code === it.code), before = { scheduled_start:t.scheduled_start, scheduled_end:t.scheduled_end };
    dv.flip = dvRects();
    patchTodo(it.code, { scheduled_start:nyISO(geo.date, it.m), scheduled_end:nyISO(geo.date, it.m + it.dur) });
    UI.toast(`Moved to ${tclock(it.m)}`, { action:'Undo', onAction:()=>{ dv.flip = dvRects(); patchTodo(it.code, before); } }); },
  cancel(){ const it = dv.drag; dv.drag = null; if(it){ it.el.style.transform = ''; it.el.style.transition = ''; } if(dv.pending) dvRender(); }
};
const dvInbDrag = {
  start(g){ const el = g.el, r = el.getBoundingClientRect(), gh = el.cloneNode(true);
    gh.removeAttribute('data-dv-inb'); gh.classList.add('dv-ghost'); gh.setAttribute('aria-hidden', 'true'); Object.assign(gh.style, { left:r.left + 'px', top:r.top + 'px', width:r.width + 'px', height:r.height + 'px' });
    document.body.appendChild(gh); el.classList.add('dv-src');
    dv.drag = { g, code:el.dataset.dvInb, gh, el, r0:r, m:null, move:dvInbDrag.move }; dvAutoScroll(); },
  move(g){ const it = dv.drag; if(!it) return; it.g = g; it.gh.style.transform = `translate(${g.x - g.x0}px, ${g.y - g.y0}px) scale(1.05)`;
    const geo = dvTlGeo(); if(!geo) return;
    if(g.y >= geo.r.top && g.y <= geo.r.bottom){ const m = dvClamp(Math.round((geo.start + (g.y - geo.r.top - DV_TOP) / DV_PX - 15) / DV_STEP) * DV_STEP, geo.start, geo.end - 30);
      if(m !== it.m){ it.m = m; hapticPulse(); dvMarker(geo, m, tclock(m)); } }
    else if(it.m != null){ it.m = null; geo.tl.querySelector('.dv-drop')?.remove(); } },
  end(){ const it = dv.drag; dv.drag = null; if(!it) return; const geo = dvTlGeo(); geo?.tl.querySelector('.dv-drop')?.remove(); it.el.classList.remove('dv-src');
    if(it.m == null || !geo){ dvInbDrag.back(it); return; }
    it.gh.remove(); const t = allTodos.find(x=>x.code === it.code); if(!t) return;
    const before = { scheduled_start:t.scheduled_start, scheduled_end:t.scheduled_end, due_date:t.due_date };
    patchTodo(it.code, { scheduled_start:nyISO(geo.date, it.m), scheduled_end:nyISO(geo.date, it.m + 30), due_date:geo.date });
    UI.toast(`Scheduled for ${tclock(it.m)}`, { action:'Undo', onAction:()=>patchTodo(it.code, before) }); },
  cancel(){ const it = dv.drag; dv.drag = null; if(!it) return; document.querySelector('#planDV .dv-drop')?.remove(); it.el.classList.remove('dv-src'); dvInbDrag.back(it); },
  back(it){ const gh = it.gh; try{ const a = gh.animate([{ transform:gh.style.transform || 'none' }, { transform:'none' }], { duration:UI.reduced() ? 0 : 320, easing:'cubic-bezier(.22,1,.36,1)' }); a.onfinish = ()=>gh.remove(); }catch(e){ gh.remove(); } setTimeout(()=>gh.remove(), 500); if(dv.pending) dvRender(); }
};

// ---------- wiring (once per host; the host's content is re-rendered) ----------
function dvWire(host){
  if(host.__dv) return; host.__dv = true;
  host.addEventListener('click', e=>{
    const t = e.target;
    const v = t.closest('[data-dv-view]'); if(v){ dvSetView(v.dataset.dvView); return; }
    if(t.closest('[data-dv-today]')){ dv.scrolledFor = null; if(dv.view === 'month') dv.month = localToday().slice(0, 7); dvGo(localToday()); return; }
    const dd = t.closest('[data-dv-date]'); if(dd){ dvGo(dd.dataset.dvDate); return; }
    const op = t.closest('[data-dv-open]'); if(op){ dv.scrolledFor = null; dvGo(op.dataset.dvOpen, { view:'day' }); return; }
    const mo = t.closest('[data-dv-month]'); if(mo){ const [y, m] = (dv.month || dvSel().slice(0, 7)).split('-').map(Number), nd = new Date(y, m - 1 + Number(mo.dataset.dvMonth), 1);
      dv.month = `${nd.getFullYear()}-${String(nd.getMonth() + 1).padStart(2, '0')}`; dvRender(); return; }
    const ck = t.closest('[data-dv-check]'); if(ck){ e.stopPropagation(); dvCheck(ck); return; }
    const hit = t.closest('.dv-hit'); if(hit){ dvOpenBlock(hit.closest('.dv-blk')); return; }
    const inb = t.closest('[data-dv-inb]'); if(inb){ dvScheduleSheet(inb.dataset.dvInb, { from:inb }); return; }
    if(t.closest('[data-dv-new]')){ dvNewTask(dvSel(), null); return; }
    const gap = t.closest('[data-dv-gap]'); if(gap){ dvNewTask(dvSel(), Number(gap.dataset.dvGap)); return; }
    const ad = t.closest('[data-dv-area]'); if(ad){ const a = ad.dataset.dvArea; if(typeof AREAS2 !== 'undefined' && AREAS2[a]) openArea(a); else openSheet(a); }
  });
  host.addEventListener('keydown', e=>{
    const b = e.target.closest('.dv-day'); if(!b) return;
    const step = { ArrowLeft:-1, ArrowRight:1, PageUp:-7, PageDown:7 }[e.key]; if(!step) return; e.preventDefault();
    dvGo(isoAddDays(b.dataset.dvDate, step)); requestAnimationFrame(()=>host.querySelector('.dv-pane:not([inert]) .dv-day.sel')?.focus({ preventScroll:true }));
  });
  // week strip: follow the finger, spring to the next/previous week
  let st = null;
  host.addEventListener('touchstart', e=>{ const s = e.target.closest('.dv-strip'); st = null; if(!s || e.touches.length > 1) return;
    st = { s, tr:s.querySelector('.dv-track'), x0:e.touches[0].clientX, y0:e.touches[0].clientY, dx:0, lock:null, w:s.offsetWidth, v:UI.tracker() }; st.v.add(st.x0, st.y0); }, { passive:true });
  host.addEventListener('touchmove', e=>{ if(!st) return; const p = e.touches[0]; st.dx = p.clientX - st.x0; st.v.add(p.clientX, p.clientY);
    if(!st.lock){ if(Math.abs(st.dx) < 8 && Math.abs(p.clientY - st.y0) < 8) return; st.lock = Math.abs(st.dx) > Math.abs(p.clientY - st.y0) ? 'x' : 'y'; if(st.lock === 'y'){ st = null; return; } }
    if(e.cancelable) e.preventDefault(); st.tr.style.transition = 'none'; st.tr.style.transform = `translateX(calc(-100% + ${st.dx}px))`; }, { passive:false });
  const stEnd = () => { if(!st) return; const x = st; st = null; if(x.lock !== 'x') return;
    const vx = x.v.v().x, dir = (Math.abs(x.dx) > x.w * 0.22 || (Math.abs(vx) > 500 && Math.abs(x.dx) > 24)) ? (x.dx < 0 ? 1 : -1) : 0;
    UI.spring(x.dx, dir ? -dir * x.w : 0, v=>{ x.tr.style.transform = `translateX(calc(-100% + ${v}px))`; }, { ...MOTION.snap, v:vx, eps:0.5, done:()=>{ if(dir){ hapticPulse(); dvGo(isoAddDays(dvSel(), 7 * dir)); } else x.tr.style.transform = ''; } }); };
  host.addEventListener('touchend', stEnd); host.addEventListener('touchcancel', stEnd);
  // pull down from the top of the page = back to Today
  let pl = null;
  host.addEventListener('touchstart', e=>{ pl = null; if(e.touches.length > 1 || e.target.closest('.dv-strip, .dv-rail, .dv-allday, .dv-blk')) return;
    const sc = dvScroller(host); if(sc.scrollTop > 0 || (dvSel() === localToday() && dv.view === 'day')) return;
    pl = { sc, y0:e.touches[0].clientY, x0:e.touches[0].clientX, dy:0, lock:null }; }, { passive:true });
  host.addEventListener('touchmove', e=>{ if(!pl) return; const p = e.touches[0], dy = p.clientY - pl.y0;
    if(!pl.lock){ if(Math.abs(dy) < 8 && Math.abs(p.clientX - pl.x0) < 8) return; pl.lock = dy > 0 && Math.abs(dy) > Math.abs(p.clientX - pl.x0) && pl.sc.scrollTop <= 0 ? 'y' : 'no'; if(pl.lock === 'no'){ pl = null; return; } }
    if(e.cancelable) e.preventDefault(); pl.dy = dy; const shift = Math.min(110, dy * 0.45); host.style.transform = `translateY(${shift}px)`;
    const armed = shift > 56, ind = host.querySelector('.dv-pull'); if(ind && ind.classList.contains('armed') !== armed){ ind.classList.toggle('armed', armed); if(armed) hapticPulse(); } }, { passive:false });
  const plEnd = () => { if(!pl) return; const x = pl; pl = null; if(x.lock !== 'y') return; const shift = Math.min(110, x.dy * 0.45);
    UI.spring(shift, 0, v=>{ host.style.transform = v > 0.5 ? `translateY(${v}px)` : ''; }, { ...MOTION.snap, eps:0.5 });
    host.querySelector('.dv-pull')?.classList.remove('armed');
    if(shift > 56){ dv.scrolledFor = null; if(dv.view === 'month') dv.month = localToday().slice(0, 7); dvGo(localToday(), { view: dv.view === 'month' ? 'day' : dv.view }); } };
  host.addEventListener('touchend', plEnd); host.addEventListener('touchcancel', plEnd);
  // timeline blocks: swipe, hold for More, hold and drag to move
  UI.gestures(host, '.dv-blk', {
    right: el => { const t = dvTaskOf(el); return t && t.status === 'open' ? { label:'Done', icon:'done', color:'var(--c-ok)', run:()=>completeTodoWithUndo(t.code) } : null; },
    left: el => { const t = dvTaskOf(el); return t && t.status === 'open' ? { label:'Tomorrow', icon:'later', color:'var(--c-surface-2)', ink:'var(--c-text)', run:()=>todoTomorrow(t.code) } : null; },
    longPress: el => dvBlockMore(el),
    lift: dvLift
  });
  UI.gestures(host, '.dv-inb[data-dv-inb]', { longPress: el => dvScheduleSheet(el.dataset.dvInb, { from:el }), lift: dvInbDrag });
  dv.today = localToday();
  if(!dv.timer) dv.timer = setInterval(()=>{ if(document.visibilityState === 'visible') dvTick(); }, 30000);
  document.addEventListener('visibilitychange', ()=>{ if(document.visibilityState === 'visible') dvTick(); });
}
