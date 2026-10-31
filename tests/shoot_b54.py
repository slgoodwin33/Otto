import json, re, asyncio
exec(open('/mnt/user-data/outputs/otto-paper-wip/testkit/shoot_life.py').read().split('async def main')[0])
_route=route; MODE={'refresh':'ok'}
async def rt(r):
    u=r.request.url
    if 'weather.gov' in u or 'jsdelivr' in u or 'nominatim' in u: return await r.abort()
    if '/auth/v1/token' in u:
        if MODE['refresh']=='drop': return await r.abort('failed')
        if MODE['refresh']=='reject': return await r.fulfill(status=400, content_type='application/json', body='{"error":"invalid_grant"}')
        return await r.fulfill(status=200, content_type='application/json', body=json.dumps({"access_token":"t2","refresh_token":"r2","expires_at":9999999999}))
    return await _route(r)
AXE=open('/tmp/axe/package/axe.min.js').read()
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome')
        page=await (await b.new_context(viewport={'width':390,'height':844}, device_scale_factor=2, is_mobile=True, has_touch=True, timezone_id='America/New_York')).new_page()
        errs=[]; page.on('pageerror', lambda e: errs.append(str(e)[:200]))
        await page.route('**/*', rt); await page.goto('http://localhost:8765/paper_test.html')
        await page.evaluate("session = { access_token:'t', refresh_token:'r', expires_at: Math.floor(Date.now()/1000)+3600, user:{email:'slgoodwin33@gmail.com'} }; showApp();")
        await page.wait_for_timeout(2400)
        # sign-in: dropped connection keeps you signed in; a real rejection signs out
        MODE['refresh']='drop'; await page.evaluate("session.expires_at = 0"); kept=await page.evaluate("refreshSession()"); print('refresh dropped 3x → stays signed in:', kept)
        MODE['refresh']='reject'; print('server rejects → sign in again:', not await page.evaluate("refreshSession()"))
        MODE['refresh']='ok'; await page.evaluate("session = { access_token:'t', refresh_token:'r', expires_at: Math.floor(Date.now()/1000)+3600 }")
        await page.evaluate("openArea('assets')"); await page.wait_for_timeout(1200)
        vis=await page.evaluate("[...document.querySelectorAll('#panelAssets .map-btn, #mapSummary, #mapWeek')].filter(e=>getComputedStyle(e).display!=='none').length")
        print('floating buttons / chip / pill visible:', vis, '| sheet height at rest:', await page.evaluate("Math.round(document.getElementById('mapSheet').getBoundingClientRect().height)"))
        await page.screenshot(path='/home/claude/paper/m_peek.png')
        for t in ['timeline','insights','weather','layers']:
            await page.click(f'[data-mstab="{t}"]'); await page.wait_for_timeout(600)
            shown=await page.evaluate("['tlSheet','insSheet','wxSheet','mapPanel'].filter(id=>!document.getElementById(id).hidden)")
            print(f'{t:9} → open panel:', shown, '| height:', await page.evaluate("Math.round(document.getElementById('mapSheet').getBoundingClientRect().height)"))
            await page.screenshot(path=f'/home/claude/paper/m_{t}.png')
        print('layers date chips hidden:', await page.evaluate("document.getElementById('mapRanges').hidden && document.getElementById('mapDays').hidden"), '| items folded:', await page.evaluate("!!document.querySelector('.ms-items') && !document.querySelector('.ms-items').open"))
        await page.add_script_tag(content=AXE)
        res=await page.evaluate("""async()=>{ const r = await axe.run(document.getElementById('mapSheet'), { runOnly:{ type:'tag', values:['wcag2a','wcag2aa','wcag21aa','wcag22aa'] } }); return r.violations.map(v=>v.id+':'+v.nodes.length); }"""); print('axe map sheet:', res or 'no violations')
        await page.click('[data-mstab="layers"]'); await page.wait_for_timeout(500)
        print('tap open tab again → folds to peek:', await page.evaluate("document.getElementById('mapSheet').dataset.snap"))
        print('errors:', errs or 'none'); await b.close()
asyncio.run(main())
