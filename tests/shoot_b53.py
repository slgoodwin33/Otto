import json, re, asyncio
exec(open('/mnt/user-data/outputs/otto-paper-wip/testkit/shoot_life.py').read().split('async def main')[0])
_route=route
STREAM = '\n'.join(json.dumps(e) for e in [{"t":"status","s":"Reading your data"},{"t":"status","s":"Thinking"},
  {"t":"think","s":"He sent a receipt from The Gavel. Check whether it's already saved before filing it."},{"t":"status","s":"Saving the receipt"},
  {"t":"action","id":7,"summary":"Saved The Gavel Public House receipt: 6 items · $106.43"},{"t":"done","text":"Saved The Gavel receipt and linked it to your $123.43 charge (tip $17.00).","actions":[{"id":7,"summary":"Saved The Gavel Public House receipt: 6 items · $106.43"}],"sources":[]}])+'\n'
async def rt(r):
    u=r.request.url
    if 'weather.gov' in u or 'jsdelivr' in u or 'nominatim' in u: return await r.abort()
    if '/functions/v1/otto-chat' in u:
        b=json.loads(r.request.post_data or '{}')
        if b.get('stream'): await asyncio.sleep(0.6); return await r.fulfill(status=200, headers={'content-type':'application/x-ndjson'}, body=STREAM)
    return await _route(r)
AXE=open('/tmp/axe/package/axe.min.js').read()
async def audit(page, name):
    await page.add_script_tag(content=AXE)
    res=await page.evaluate("""async()=>{ const r = await axe.run(document, { runOnly:{ type:'tag', values:['wcag2a','wcag2aa','wcag21aa','wcag22aa'] } }); return r.violations.map(v=>({id:v.id, n:v.nodes.length, ex:v.nodes.slice(0,2).map(n=>n.target.join(' ')).join(' | ').slice(0,120)})); }""")
    print(f'axe {name}:', json.dumps(res) if res else 'no violations')
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome')
        page=await (await b.new_context(viewport={'width':390,'height':844}, device_scale_factor=2, is_mobile=True, has_touch=True, timezone_id='America/New_York')).new_page()
        errs=[]; page.on('pageerror', lambda e: errs.append(str(e)[:200]))
        await page.route('**/*', rt); await page.goto('http://localhost:8765/paper_test.html')
        await page.evaluate("session = { access_token:'t', refresh_token:'r', expires_at: Math.floor(Date.now()/1000)+3600, user:{email:'slgoodwin33@gmail.com'} }; showApp();")
        await page.wait_for_timeout(2500)
        print('status band:', await page.evaluate("getComputedStyle(document.querySelector('.ia2-status')).position"), '| ring in dock:', await page.evaluate("!!document.querySelector('.ia2-search .otto-ring')"), '| accent:', await page.evaluate("getComputedStyle(document.body).getPropertyValue('--accent').trim()"))
        await page.evaluate("window.scrollTo(0, 300)"); await page.wait_for_timeout(200); await page.screenshot(path='/home/claude/paper/c_home.png'); await page.evaluate("window.scrollTo(0,0)")
        await audit(page,'home')
        # chat streaming
        await page.click('[data-ia2search]'); await page.wait_for_timeout(300)
        print('photo bar hidden:', await page.evaluate("getComputedStyle(document.getElementById('photoChip')).display"), '| input outline:', await page.evaluate("getComputedStyle(document.getElementById('askInput')).outlineStyle"))
        await page.fill('#askInput', "Here's my receipt."); await page.press('#askInput', 'Enter'); await page.wait_for_timeout(250)
        print('while streaming:', (await page.inner_text('.msg.otto:last-child')).replace('\n',' | ')[:80])
        await page.screenshot(path='/home/claude/paper/c_thinking.png')
        await page.wait_for_timeout(1500)
        print('after done:', (await page.inner_text('.msg.otto:last-of-type')).replace('\n',' | ')[:200], '| panel open:', await page.evaluate("document.querySelector('.think') && document.querySelector('.think').open"))
        await page.screenshot(path='/home/claude/paper/c_answer.png')
        await page.click('.think summary'); await page.wait_for_timeout(200); await page.screenshot(path='/home/claude/paper/c_expanded.png')
        # simulate the keyboard (iOS visual viewport shrinking by 336px)
        await page.evaluate("document.documentElement.style.setProperty('--kb','336px'); scrollChat(true)"); await page.wait_for_timeout(200)
        vis=await page.evaluate("(()=>{ const t=document.getElementById('chatThread'), last=t.lastElementChild.getBoundingClientRect(), comp=document.querySelector('.composer').getBoundingClientRect(); return {lastBottom:Math.round(last.bottom), composerTop:Math.round(comp.top), threadBottom:Math.round(t.getBoundingClientRect().bottom)}; })()")
        print('keyboard open → last message bottom', vis['lastBottom'], '≤ composer top', vis['composerTop'], ':', vis['lastBottom'] <= vis['composerTop'])
        await page.screenshot(path='/home/claude/paper/c_keyboard.png')
        await audit(page,'chat')
        await page.evaluate("document.documentElement.style.setProperty('--kb','0px'); document.body.classList.remove('chatting')")
        # map
        await page.evaluate("openArea('assets')"); await page.wait_for_timeout(1200)
        print('timeline auto-opened:', await page.evaluate("!document.getElementById('tlSheet').hidden"))
        await page.click('#tlOpen'); await page.wait_for_timeout(600)
        h1=await page.evaluate("Math.round(document.getElementById('tlSheet').getBoundingClientRect().height)")
        g=await page.eval_on_selector('.tl-grab','e=>{const r=e.getBoundingClientRect(); return [r.x+r.width/2, r.y+r.height/2]}')
        await page.mouse.move(*g); await page.mouse.down(); await page.mouse.move(g[0], g[1]-220, steps=8); await page.mouse.up(); await page.wait_for_timeout(600)
        h2=await page.evaluate("Math.round(document.getElementById('tlSheet').getBoundingClientRect().height)")
        print('timeline opened via button, drag up:', h1, '→', h2, '| grab handle present, size buttons hidden:', await page.evaluate("getComputedStyle(document.querySelector('.otto-map-sizebar')||document.body).display"))
        await page.screenshot(path='/home/claude/paper/c_tl.png')
        g=await page.eval_on_selector('.tl-grab','e=>{const r=e.getBoundingClientRect(); return [r.x+r.width/2, r.y+r.height/2]}')
        await page.mouse.move(*g); await page.mouse.down(); await page.mouse.move(g[0], g[1]+900, steps=10); await page.mouse.up(); await page.wait_for_timeout(300)
        print('dragged down past peek → closed:', await page.evaluate("document.getElementById('tlSheet').hidden"))
        await page.click('#mapMenuBtn'); await page.wait_for_timeout(500)
        print('layers sheet:', await page.evaluate("(()=>{const r=document.getElementById('mapPanel').getBoundingClientRect(); return {top:Math.round(r.top), bottom:Math.round(r.bottom), head:!!document.querySelector('.mp-head'), backdrop:!document.querySelector('.mp-backdrop').hidden}})()"))
        await page.screenshot(path='/home/claude/paper/c_layers.png')
        await audit(page,'map layers')
        await page.click('.mp-done'); await page.wait_for_timeout(200); print('Done closes:', await page.evaluate("document.getElementById('mapPanel').hidden"))
        print('errors:', errs or 'none'); await b.close()
asyncio.run(main())
