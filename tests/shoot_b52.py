import json, re, asyncio, time
exec(open('/mnt/user-data/outputs/otto-paper-wip/testkit/shoot_life.py').read().split('async def main')[0])
SLOW={'on':False}
_route=route
async def rt(r):
    u=r.request.url
    if 'weather.gov' in u or 'jsdelivr' in u or 'nominatim' in u: return await r.abort()
    if SLOW['on'] and 'supabase.co' in u: await asyncio.sleep(3)
    return await _route(r)
AXE=open('/tmp/axe/package/axe.min.js').read()
async def audit(page, name):
    await page.add_script_tag(content=AXE)
    res=await page.evaluate("""async()=>{ const r = await axe.run(document, { runOnly:{ type:'tag', values:['wcag2a','wcag2aa','wcag21aa','wcag22aa'] }, resultTypes:['violations'] });
      return r.violations.map(v=>({id:v.id, impact:v.impact, n:v.nodes.length, ex:v.nodes.slice(0,2).map(n=>n.target.join(' ')).join(' | ').slice(0,140)})); }""")
    print(f'axe {name}:', json.dumps(res) if res else 'no violations')
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome')
        ctx=await b.new_context(viewport={'width':390,'height':844}, device_scale_factor=2, is_mobile=True, has_touch=True, timezone_id='America/New_York')
        page=await ctx.new_page(); errs=[]; page.on('pageerror', lambda e: errs.append(str(e)[:200]))
        await page.route('**/*', rt); await page.goto('http://localhost:8765/paper_test.html')
        login="session = { access_token:'t', refresh_token:'r', expires_at: Math.floor(Date.now()/1000)+3600, user:{email:'slgoodwin33@gmail.com'} }; showApp();"
        await page.evaluate(login); await page.wait_for_timeout(2600)
        final=await page.eval_on_selector_all('.wdg-big, .wdg-mid','els=>els.map(e=>e.innerText.split("\\n")[0])')
        print('numbers after count-up:', final)
        await audit(page,'home')
        # widget editing
        await page.click('[data-homeedit]'); await page.wait_for_timeout(250)
        await page.click('[data-heshow="closet"]'); await page.wait_for_timeout(150)
        await page.click('[data-hesize="steps:w"]'); await page.wait_for_timeout(150)
        await page.click('[data-heup="next"]'); await page.wait_for_timeout(150)
        await page.screenshot(path='/home/claude/paper/p_edit.png')
        await audit(page,'home edit')
        await page.click('[data-homeedit]'); await page.wait_for_timeout(300)
        print('order after edits:', await page.eval_on_selector_all('.wdg-grid > .wdg','els=>els.map(e=>e.dataset.w+(e.classList.contains("wide")?"(wide)":""))'))
        await page.click('[data-w="food"]'); await page.wait_for_timeout(300); await page.evaluate("closeSheet()"); await page.wait_for_timeout(200)
        await page.click('[data-w="food"]'); await page.wait_for_timeout(300); await page.evaluate("closeSheet()"); await page.wait_for_timeout(200)
        await page.click('[data-homeedit]'); await page.wait_for_timeout(200); await page.click('[data-hebyuse]'); await page.wait_for_timeout(150); await page.click('[data-homeedit]'); await page.wait_for_timeout(300)
        print('sorted by use (kitchen opened twice):', await page.eval_on_selector_all('.wdg-grid > .wdg','els=>els.slice(0,3).map(e=>e.dataset.w)'))
        await page.screenshot(path='/home/claude/paper/p_home.png')
        # other screens
        for k in ['all','closet','documents']:
            await page.evaluate(f"openArea('{k}')"); await page.wait_for_timeout(900); await audit(page, k); await page.evaluate("closeSheet()"); await page.wait_for_timeout(300)
        await page.evaluate("openArea('money')"); await page.wait_for_timeout(900); await audit(page,'money'); await page.evaluate("closeSheet()")
        cache=await page.evaluate("JSON.parse(localStorage.getItem('otto.homecache')||'{}').at || null"); print('cache saved at:', cache, '| size KB:', await page.evaluate("Math.round((localStorage.getItem('otto.homecache')||'').length/1024)"))
        # instant open: reload with a slow network
        SLOW['on']=True; await page.reload(); t0=time.time(); await page.evaluate(login); await page.wait_for_timeout(500)
        print(f"at {round(time.time()-t0,1)}s slow →", await page.evaluate("(document.querySelector('.ia2-kicker')||{}).innerText"), "| steps:", await page.evaluate("[...document.querySelectorAll('.wdg-mid')].map(e=>e.innerText).join(', ')"))
        await page.screenshot(path='/home/claude/paper/p_cached.png')
        for t in (8, 16):
            await page.wait_for_timeout(8000 if t==8 else 8000); print(f'after {t}s → kicker:', await page.evaluate("(document.querySelector('.ia2-kicker')||{}).innerText"), '| budget loaded:', await page.evaluate("!!window.__freshData"))
        print('errors:', errs or 'none'); await b.close()
asyncio.run(main())
