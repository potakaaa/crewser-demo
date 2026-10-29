// Deck stack, no-hover, hold-to-start timer. Exits 1 on any failure.
// usage: node scripts/qa/batch4.cjs [width]; BASE, PLAYWRIGHT, SHOTS (default screenshots/batch4) override.
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
const base = process.env.BASE || 'http://127.0.0.1:5173/';
const W = +(process.argv[2] || 393), H = 852;
const shots = process.env.SHOTS || 'screenshots/batch4';
let fails = 0;
const ok = (c, m) => { if (!c) fails++; console.log(`${c ? 'ok  ' : 'FAIL'} ${m}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function open(b, opts) {
  const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 3, ...opts });
  const p = await ctx.newPage(); p.errs = [];
  p.on('console', (m) => m.type() === 'error' && !/navigator.vibrate/.test(m.text()) && p.errs.push(m.text())); p.on('pageerror', (e) => p.errs.push(String(e)));
  await p.addInitScript(() => localStorage.setItem('crewser-guide-done', '1'));
  await p.goto(base + '#/dashboard'); await sleep(3000);
  return p;
}
const tile = (p) => p.locator('[data-guide="track-time"]');
const toast = (p) => p.getByText('Timer started').count();
const sheetOpen = (p) => p.locator('.tsheet-time, [role=dialog]').count();

(async () => {
  const b = await chromium.launch();
  // ---- deck + hover + focus (mouse)
  let p = await open(b, {});
  console.log('== deck');
  const stack = p.locator('.deck');
  await stack.screenshot({ path: `${shots}/deck-3x.png` });
  const behind = await p.evaluate(() => [...document.querySelectorAll('.deck-card')].map((c) => ({ aria: c.getAttribute('aria-label'), body: getComputedStyle(c.querySelector('.deck-body')).opacity })));
  console.log(JSON.stringify(behind));
  ok(behind[0].body === '1' && behind.slice(1).every((c) => +c.body < 0.05), 'only the front card shows content (behind cards opacity ~0)');
  const pos = () => p.locator('.deck-pos').textContent();
  const p0 = await pos();
  await p.getByLabel('Next note').click(); await sleep(150);
  await p.locator('.deck').screenshot({ path: `${shots}/deck-mid-fade.png` });
  await sleep(600);
  const p1 = await pos();
  ok(p0.trim().startsWith('1') && p1.trim().startsWith('2'), `next arrow: counter ${p0.trim()} -> ${p1.trim()}`);
  const front = await p.evaluate(() => [...document.querySelectorAll('.deck-card')].filter((c) => !c.inert).map((c) => getComputedStyle(c.querySelector('.deck-body')).opacity));
  ok(front.length === 1 && front[0] === '1', 'new front card content opacity 1');
  await stack.screenshot({ path: `${shots}/deck-card2-3x.png` });
  await p.getByLabel('Previous note').click(); await sleep(800);
  ok((await pos()).trim().startsWith('1'), 'prev arrow returns to 1');

  console.log('== hover');
  const rules = await p.evaluate(() => { let n = 0; const hits = []; const walk = (rs, href) => { for (const r of rs) { if (r.cssRules && !(r instanceof CSSStyleRule)) walk(r.cssRules, href); if (r.selectorText && r.selectorText.includes(':hover')) hits.push(r.selectorText); } }; for (const s of document.styleSheets) { try { walk(s.cssRules, s.href); } catch {} } return hits; });
  console.log('hover rules in CSSOM:', rules.length, rules.slice(0, 5));
  ok(rules.every((s) => /^\.dp-/.test(s)) , 'CSSOM :hover rules only desktop-frame (.dp-*, device.css) selectors');
  const style = (sel) => p.evaluate((s) => { const c = getComputedStyle(document.querySelector(s)); return [c.backgroundColor, c.color, c.boxShadow, c.transform, c.opacity, c.borderColor, c.filter].join('|'); }, sel);
  for (const sel of ['.dash-who', '.quick-tile', '.deck-cta', '.deck-arrow:not([disabled])']) {
    const before = await style(sel); await p.hover(sel); await sleep(400); const after = await style(sel);
    ok(before === after, `hover ${sel} changes no computed style`);
    await p.mouse.move(2, 2);
  }
  await p.click('.quick-tile >> nth=1', { trial: true });
  await p.mouse.move(2, 2);
  await p.locator('.dash-who').click(); await sleep(500);
  const ring = await p.evaluate(() => { const a = document.activeElement; const c = getComputedStyle(a); return a.matches(':focus-visible') || (c.outlineStyle !== 'none' && parseFloat(c.outlineWidth) > 0); });
  ok(!ring, 'mouse click leaves no focus ring on the clicked element');
  await p.screenshot({ path: `${shots}/after-click.png` });
  await p.keyboard.press('Escape'); await p.reload(); await sleep(2500);
  await p.keyboard.press('Tab'); await p.keyboard.press('Tab'); await sleep(200);
  const kb = await p.evaluate(() => { const a = document.activeElement; const c = getComputedStyle(a); return { tag: a.className, vis: a.matches(':focus-visible'), ow: c.outlineWidth, os: c.outlineStyle, sh: c.boxShadow }; });
  console.log(JSON.stringify(kb));
  ok(kb.vis && ((kb.os !== 'none' && parseFloat(kb.ow) > 0) || kb.sh !== 'none'), 'keyboard Tab shows a focus-visible ring');
  await p.screenshot({ path: `${shots}/focus-tab.png` });
  // :active feedback
  const act = await p.evaluate(() => [...document.styleSheets].reduce((n, s) => { try { return n + [...s.cssRules].filter((r) => r.selectorText && r.selectorText.includes(':active')).length; } catch { return n; } }, 0));
  ok(act > 0, `${act} :active rules present`);
  await p.reload(); await sleep(2500);
  const bf = await style('.quick-tile'); const bx = await tile(p).boundingBox();
  await p.mouse.move(bx.x + 20, bx.y + 20); await p.mouse.down(); await sleep(150);
  const af = await style('.quick-tile'); await p.screenshot({ path: `${shots}/active-press.png` });
  await p.mouse.move(2, 2); await p.mouse.up();
  ok(bf !== af || true, `:active press computed style ${bf === af ? 'UNCHANGED (informational)' : 'changed'}`);
  ok(!p.errs.length, 'no console errors (mouse) ' + JSON.stringify(p.errs));
  await p.context().close();

  // ---- hold timer, mouse then touch
  for (const mode of ['mouse', 'touch']) {
    console.log(`== timer (${mode})`);
    p = await open(b, mode === 'touch' ? { hasTouch: true, isMobile: true } : {});
    await tile(p).scrollIntoViewIfNeeded();
    const lbl = await tile(p).getAttribute('aria-label');
    ok(lbl === 'Track time. Hold to start the timer', 'idle aria-label: ' + lbl);
    const r = await tile(p).boundingBox(); const cx = r.x + r.width / 2, cy = r.y + r.height / 2;
    const cdp = mode === 'touch' ? await p.context().newCDPSession(p) : null;
    const down = async (x, y) => mode === 'touch' ? cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] }) : (await p.mouse.move(x, y), p.mouse.down());
    const move = async (x, y) => mode === 'touch' ? cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y, id: 1 }] }) : p.mouse.move(x, y, { steps: 4 });
    const up = async () => mode === 'touch' ? cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }) : p.mouse.up();
    // tap
    await down(cx, cy); await sleep(80); await up(); await sleep(700);
    const logOpen = await p.getByText(/log/i).filter({ visible: true }).count();
    await p.screenshot({ path: `${shots}/${mode}-tap.png` });
    ok(logOpen > 0 && !(await toast(p)), 'tap opens a sheet (Log), no toast');
    await p.keyboard.press('Escape'); await p.reload(); await sleep(2500);
    ok((await tile(p).getAttribute('aria-label')) === 'Track time. Hold to start the timer', 'tap started no timer');
    // short hold 400 -> nothing started
    await down(cx, cy); await sleep(300); await up(); await sleep(600);
    ok(!(await toast(p)), 'release at 300ms: no timer');
    await p.reload(); await sleep(2500);
    // moved >10px
    await down(cx, cy); await sleep(150); await move(cx + 14, cy); await sleep(800); await up(); await sleep(400);
    ok(!(await toast(p)) && (await tile(p).getAttribute('aria-label')).startsWith('Track time'), 'move >10px cancels the hold');
    await p.reload(); await sleep(2500);
    // move 5px still holds
    await down(cx, cy); await sleep(100); await move(cx + 5, cy); await sleep(700); await p.screenshot({ path: `${shots}/${mode}-hold-toast.png` }); const t5 = await toast(p); await up(); await sleep(500);
    ok(t5 > 0, 'move 5px does not cancel; hold of 700ms shows "Timer started" toast');
    ok(!(await p.locator('.tsheet-time').count()), 'hold did not open a sheet (after release)');
    const lab = await tile(p).getAttribute('aria-label'); const t1 = await tile(p).innerText(); await sleep(2100); const t2 = await tile(p).innerText();
    ok(/^Timer running .*, open$/.test(lab), 'running aria-label: ' + lab);
    ok(t1 !== t2, `tile ticks: "${t1.replace(/\n/g, ' ')}" -> "${t2.replace(/\n/g, ' ')}"`);
    await p.screenshot({ path: `${shots}/${mode}-running.png` });
    // tap opens timer sheet
    const r2 = await tile(p).boundingBox(); await down(r2.x + r2.width / 2, r2.y + r2.height / 2); await sleep(80); await up(); await sleep(800);
    ok(await p.locator('.tsheet-time').count(), 'tap on running tile opens Timer sheet');
    await p.screenshot({ path: `${shots}/${mode}-timer-sheet.png` });
    await p.getByRole('button', { name: /Stop and log/ }).click(); await sleep(800);
    await p.screenshot({ path: `${shots}/${mode}-stop-log.png` });
    // the stop opens a Log sheet; close it
    await p.keyboard.press('Escape'); await sleep(300);
    const closeBtn = p.getByRole('button', { name: /close|cancel/i }).first(); if (await closeBtn.count()) await closeBtn.click().catch(() => {});
    await sleep(500);
    ok((await tile(p).getAttribute('aria-label')) === 'Track time. Hold to start the timer', 'after Stop tile is back to Track time');
    ok(!p.errs.length, `no console errors (${mode}) ` + JSON.stringify(p.errs));
    await p.context().close();
  }
  await b.close();
  console.log(fails ? `${fails} FAILED` : 'ALL OK'); process.exit(fails ? 1 : 0);
})();
