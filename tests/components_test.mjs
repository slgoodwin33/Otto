// .103 shared components: task list swipe (right = Done + Undo, left = Tomorrow), long press = More menu, sheet drag.
import { launch, path2 } from './harness.mjs';
const T = await launch({ dsf: Number(process.env.DSF || 1) });
const { page } = T;
const out = (...a) => console.log(...a);
await page.evaluate(()=>{ openArea('todos'); setPlanTab('backlog'); });
await page.waitForTimeout(700);
out('rows:', await page.$$eval('#todoList .swipe', els=>els.map(e=>e.dataset.code + ' ' + e.innerText.split('\n')[0])));
await T.shot('c1_backlog');
// swipe right on the first open row
const row = await page.$('#todoList .swipe > .trow'); const b = await row.boundingBox();
const y = b.y + 24;
await T.touch(path2([b.x + 30, y], [b.x + 260, y], 14), { step: 12 });
await page.waitForTimeout(700);
out('after swipe right writes:', JSON.stringify(T.writes.slice(-1)));
out('toast:', await page.$eval('#ottoNotice', e=>e.className + ' | ' + e.innerText).catch(()=>'none'));
await T.shot('c2_swiped');
// swipe left on a row: Tomorrow
const rowL = (await page.$$('#todoList .swipe > .trow'))[0]; const bl = await rowL.boundingBox();
await T.touch(path2([bl.x + 300, bl.y + 24], [bl.x + 40, bl.y + 24], 14), { step: 12 });
await page.waitForTimeout(700);
out('after swipe left writes:', JSON.stringify(T.writes.slice(-1)));
// long press the next row → More menu
const row2 = (await page.$$('#todoList .swipe > .trow'))[0]; const b2 = await row2.boundingBox();
await T.touch([[b2.x + 120, b2.y + 20], [b2.x + 121, b2.y + 20]], { hold: 650 });
await page.waitForTimeout(600);
out('menu:', await page.$$eval('.o-menu button', els=>els.map(e=>e.innerText)).catch(()=>[]));
await T.shot('c3_more');
out('axe (menu):', JSON.stringify(await T.axe('.o-sheet-wrap')));
// drag the sheet head down to close
const head = await page.$('.o-sheet-head');
if(head){ const hb = await head.boundingBox();
  await T.touch(path2([hb.x + hb.width/2, hb.y + 10], [hb.x + hb.width/2, hb.y + 400], 10), { step: 10 });
  await page.waitForTimeout(700); }
out('sheet closed:', await page.$('.o-sheet-wrap') === null);
out('errors:', T.errors.length ? T.errors : 'none');
await T.close();
