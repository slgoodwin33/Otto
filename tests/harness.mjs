// Shared Playwright harness (repo-relative; replaces the old chat-sandbox paths). Node + the preinstalled Chromium.
//   node tests/plan_test.mjs        (each *_test.mjs imports { launch } from here)
// - serves index.html from http://localhost:8765 (passkeys need a secure origin), with iPhone safe areas 47/34 px
// - routes Supabase REST to tests/fixtures.json (python3 tests/fixtures_gen.py), honouring eq/gte/lte/gt/lt/is/in filters
//   and select=… is ignored (fixtures already mirror the real selects); PATCH/POST/DELETE are recorded in `writes`
// - Leaflet and axe-core come from tests/.cache (npm pack, see setup.sh)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, '..');
const cache = path.join(here, '.cache'), shots = path.join(here, '__screens__');
fs.mkdirSync(shots, { recursive:true });

function ensureDeps(){
  const lf = path.join(cache, 'leaflet-1.9.4/package/dist/leaflet.js'), axe = path.join(cache, 'axe-core-4.10.2/package/axe.min.js');
  if(!fs.existsSync(lf) || !fs.existsSync(axe)) execFileSync('sh', [path.join(here, 'setup.sh')], { stdio:'inherit' });
  return { lfDir: path.dirname(lf), axe: fs.readFileSync(axe, 'utf8') };
}

function serve(port = 8765){
  let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  html = html.replace(/env\(safe-area-inset-top(?:,\s*0px)?\)/g, '47px').replace(/env\(safe-area-inset-bottom(?:,\s*0px)?\)/g, '34px')
             .replace('<script src="https://cdn.plaid.com/link/v2/stable/link-initialize.js"></script>', '');
  const srv = http.createServer((req, res)=>{
    const u = req.url.split('?')[0];
    if(u === '/' || u === '/index.html'){ res.writeHead(200, { 'content-type':'text/html; charset=utf-8' }); return res.end(html); }
    const f = path.join(root, decodeURIComponent(u)); if(f.startsWith(root) && fs.existsSync(f) && fs.statSync(f).isFile()){ res.writeHead(200); return res.end(fs.readFileSync(f)); }
    res.writeHead(404); res.end();
  });
  return new Promise(r=>srv.listen(port, ()=>r(srv)));
}

// minimal PostgREST filter emulation
function filterRows(rows, params){
  let out = rows;
  for(const [k, v] of params){
    if(['select', 'order', 'limit', 'offset', 'on_conflict'].includes(k)) continue;
    const m = /^(not\.)?(eq|neq|gte|lte|gt|lt|is|in|like|ilike)\.(.*)$/s.exec(v); if(!m) continue;
    const [, neg, op, raw] = m; const get = r => k.split('->')[0] in r ? r[k] : undefined;
    const test = r => { const x = get(r); if(x === undefined) return true;
      switch(op){ case 'eq': return String(x) === raw; case 'neq': return String(x) !== raw;
        case 'gte': return String(x) >= raw; case 'lte': return String(x) <= raw; case 'gt': return String(x) > raw; case 'lt': return String(x) < raw;
        case 'is': return raw === 'null' ? x == null : raw === 'true' ? x === true : raw === 'false' ? x === false : true;
        case 'in': return raw.replace(/^\(|\)$/g, '').split(',').map(s=>s.replace(/^"|"$/g, '')).includes(String(x));
        default: return true; } };
    out = out.filter(r => neg ? !test(r) : test(r));
  }
  const order = params.get('order');
  if(order){ const [col, dir] = order.split(',')[0].split('.'); out = [...out].sort((a, b)=>{ const x = a[col], y = b[col]; if(x == y) return 0; if(x == null) return 1; if(y == null) return -1; return (x < y ? -1 : 1) * (dir === 'desc' ? -1 : 1); }); }
  const lim = Number(params.get('limit')); if(lim) out = out.slice(0, lim);
  return out;
}

export async function launch({ dsf = 1, fixtures = null, today = null, reducedMotion = false } = {}){
  const { lfDir, axe } = ensureDeps();
  execFileSync('python3', [path.join(here, 'fixtures_gen.py')], { env:{ ...process.env, ...(today ? { OTTO_TODAY: today } : {}) }, stdio:'ignore' });
  const fx = fixtures || JSON.parse(fs.readFileSync(path.join(here, 'fixtures.json'), 'utf8'));
  const srv = await serve();
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport:{ width:390, height:844 }, deviceScaleFactor:dsf, isMobile:true, hasTouch:true, timezoneId:'America/New_York', reducedMotion: reducedMotion ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  const errors = [], writes = [];
  page.on('pageerror', e=>errors.push(String(e).slice(0, 300)));
  page.on('console', m=>{ if(m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) errors.push('console: ' + m.text().slice(0, 300)); });
  page.on('dialog', d=>d.accept());
  await page.route('**/*', async r=>{
    const u = r.request().url();
    if(u.startsWith('http://localhost:8765') || u.startsWith('data:')) return r.continue();
    if(u.includes('unpkg.com/leaflet')){ const f = path.join(lfDir, u.split('/dist/')[1].split('?')[0]); return r.fulfill({ path:f, contentType: f.endsWith('.css') ? 'text/css' : 'application/javascript' }); }
    if(!u.includes('supabase.co')) return r.abort();
    if(u.includes('/functions/v1/')) return r.fulfill({ status:200, contentType:'application/json', body:JSON.stringify({ text:'Briefing.' }) });
    if(u.includes('/auth/v1/')) return r.fulfill({ status:200, contentType:'application/json', body:'{}' });
    const url = new URL(u), m = /\/rest\/v1\/(?:rpc\/)?([a-z_0-9]+)/.exec(url.pathname), t = m ? m[1] : '', method = r.request().method();
    if(method !== 'GET' && method !== 'HEAD'){
      let body = null; try{ body = JSON.parse(r.request().postData() || 'null'); }catch(e){}
      writes.push({ method, table:t, query:url.search, body });
      if(method === 'POST'){ const rows = (Array.isArray(body) ? body : [body]).map((x, i)=>({ id:900 + writes.length + i, ...x })); return r.fulfill({ status:201, contentType:'application/json', body:JSON.stringify(rows) }); }
      return r.fulfill({ status:204, body:'' });
    }
    return r.fulfill({ status:200, contentType:'application/json', body:JSON.stringify(filterRows(fx[t] || [], url.searchParams)) });
  });
  await page.goto('http://localhost:8765/');
  await page.evaluate(()=>{ session = { access_token:'t', refresh_token:'r', expires_at:Math.floor(Date.now()/1000) + 3600, user:{ email:'owner@example.com' } }; showApp(); });
  await page.waitForTimeout(1800);
  const api = {
    page, ctx, browser, errors, writes, fx,
    async shot(name){ const f = path.join(shots, name + '.png'); await page.screenshot({ path:f }); return f; },
    async axe(include = 'body'){
      await page.addScriptTag({ content:axe });
      return page.evaluate(async inc=>{ const r = await axe.run(inc, { runOnly:{ type:'tag', values:['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } });
        return r.violations.map(v=>({ id:v.id, impact:v.impact, n:v.nodes.length, help:v.help, nodes:v.nodes.slice(0, 4).map(n=>n.target.join(' ') + ' :: ' + (n.failureSummary || '').split('\n').slice(1, 2).join(' ')) })); }, include);
    },
    // touch gestures through CDP (Playwright has no touch-move API)
    async touch(points, { hold = 0, step = 16 } = {}){
      const cdp = await ctx.newCDPSession(page);
      const send = (type, p) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: p ? [{ x:p[0], y:p[1] }] : [] });
      await send('touchStart', points[0]); if(hold) await page.waitForTimeout(hold);
      for(let i = 1; i < points.length; i++){ await send('touchMove', points[i]); await page.waitForTimeout(step); }
      await send('touchEnd'); await cdp.detach();
    },
    async close(){ await browser.close(); srv.close(); }
  };
  return api;
}
// interpolate a straight drag into n points
export const path2 = (a, b, n = 12) => Array.from({ length:n + 1 }, (_, i)=>[a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n]);
