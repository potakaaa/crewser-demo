// First-visit guide + core Home flows, driven with real touch events (CDP). Exits 1 on any failure.
// usage: node scripts/qa/guide.cjs [width]; BASE overrides the URL, PLAYWRIGHT the module path, SHOTS a screenshot dir.
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
const base = process.env.BASE || 'http://127.0.0.1:5173/';
const W = +(process.argv[2] || 375), H = W === 360 ? 740 : 812;
const shots = process.env.SHOTS;
let fails = 0;
const ok = (c, m) => { if (!c) fails++; console.log(`${c ? 'ok  ' : 'FAIL'} ${m}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function open(b, { done }) {
  const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: true, isMobile: true });
  const p = await ctx.newPage();
  p.errs = [];
  p.on('console', (m) => m.type() === 'error' && p.errs.push(m.text()));
  p.on('pageerror', (e) => p.errs.push(String(e)));
  if (done) await p.addInitScript(() => { if (!sessionStorage.__seen) { sessionStorage.__seen = 1; localStorage.setItem('crewser-guide-done', '1'); } });
  p.cdp = await ctx.newCDPSession(p);
  await p.goto(base + '#/dashboard'); await sleep(3000);
  return p;
}
const touch = (p, type, x, y) => p.cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
async function swipe(p, [x1, y1], [x2, y2], steps = 10) {
  await touch(p, 'touchStart', x1, y1);
  for (let i = 1; i <= steps; i++) { await touch(p, 'touchMove', x1 + ((x2 - x1) * i) / steps, y1 + ((y2 - y1) * i) / steps); await sleep(16); }
  await touch(p, 'touchEnd'); await sleep(80);
}
const center = async (p, sel) => { const r = await p.locator(sel).first().boundingBox(); return [r.x + r.width / 2, r.y + r.height / 2, r]; };
async function tap(p, x, y) { await touch(p, 'touchStart', x, y); await sleep(40); await touch(p, 'touchEnd'); await sleep(80); }
const count = (p) => p.locator('.guide-count').textContent().catch(() => null);
const link = (p) => p.locator('.who-block').first().innerText().then((t) => t.replace(/\s+/g, ' ').trim());
async function waitStep(p, n, label) {
  for (let i = 0; i < 30; i++) { if ((await count(p)) === `${n} / 8`) return ok(true, `${label}: now at ${n} / 8`); await sleep(200); }
  ok(false, `${label}: expected ${n} / 8, got ${await count(p)}`);
}

async function guideRun(b) {
  console.log(`== guide ${W}x${H}`);
  const p = await open(b, { done: false });
  await waitStep(p, 1, 'auto-start');
  const start = await link(p); console.log('   start link:', start);
  ok(/Florentina/.test(start) && /Last Ferry/.test(start), 'starts on Focus Florentina · The Last Ferry');
  // overlay: dim covers all but the hole; touches outside blocked
  const geo = await p.evaluate(() => { const g = document.querySelector('.guide'), h = document.querySelector('.guide-hole'); const a = g.getBoundingClientRect(), r = h.getBoundingClientRect(); return { a: [a.width, a.height], h: [r.x, r.y, r.width, r.height] }; });
  ok(geo.a[0] >= W - 1 && geo.a[1] >= H - 1, `overlay covers viewport (${geo.a})`);
  const outside = await p.evaluate(() => { const bad = []; for (const [x, y] of [[5, 5], [180, innerHeight - 6], [5, 400], [370, 400], [180, 30]]) { const e = document.elementFromPoint(x, y); if (!e || !e.closest('.guide-block, .guide-card')) bad.push([x, y, e.className]); } return bad; });
  ok(!outside.length, 'points outside cut-out hit the blocker/card ' + JSON.stringify(outside));
  const inside = await p.evaluate(() => { const r = document.querySelector('.guide-hole').getBoundingClientRect(); const e = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return !!e.closest('[data-guide="deck"]'); });
  ok(inside, 'inside cut-out reaches the deck');
  // blocked tap outside: tap Calendar tab -> route unchanged
  await tap(p, 120, H - 22); await sleep(300);
  ok(/dashboard/.test(p.url()) && (await count(p)) === '1 / 8', 'tap on dock outside the hole is blocked');
  if (shots) await p.screenshot({ path: `${shots}/guide-1-${W}.png` });

  // 1 deck swipe
  let [cx, cy] = await center(p, '[data-guide="deck"]');
  await swipe(p, [cx + 100, cy], [cx - 100, cy]);
  await waitStep(p, 2, 'deck swipe');
  // 2 ruler drag
  [cx, cy] = await center(p, '[data-guide="ruler"]');
  await swipe(p, [cx + 60, cy], [cx - 80, cy], 14);
  await waitStep(p, 3, 'ruler drag');
  // 3 person (vertical)
  const l0 = await link(p);
  [cx, cy] = await center(p, '[data-guide="who"]');
  await swipe(p, [cx, cy + 20], [cx, cy - 40]);
  await waitStep(p, 4, 'person swipe');
  const l1 = await link(p); ok(l1 !== l0, `person switched: "${l0}" -> "${l1}"`);
  // 4 project (horizontal)
  [cx, cy] = await center(p, '[data-guide="who"]');
  await swipe(p, [cx + 80, cy], [cx - 80, cy]);
  await waitStep(p, 5, 'project swipe');
  const l2 = await link(p); ok(l2 !== l1, `project switched: "${l1}" -> "${l2}"`);
  // pill/toast must not leak into step 5
  await sleep(500);
  const leak = await p.evaluate(() => [...document.querySelectorAll('.toast, [class*="pill"], [class*="switch-"]')].filter((e) => e.offsetWidth && /undo|switched|acting/i.test(e.textContent)).map((e) => e.className + ':' + e.textContent.slice(0, 30)));
  ok(!leak.length, 'no switch pill/toast leaking into step 5 ' + JSON.stringify(leak));
  if (shots) await p.screenshot({ path: `${shots}/guide-5-${W}.png` });
  // 5 timer: hold 500ms
  [cx, cy] = await center(p, '[data-guide="timer"]');
  await touch(p, 'touchStart', cx, cy); await sleep(800); await touch(p, 'touchEnd');
  await waitStep(p, 6, 'timer hold');
  // 6 + dock
  [cx, cy] = await center(p, '[data-guide="add"]'); await tap(p, cx, cy);
  await waitStep(p, 7, 'tap +');
  // 7 pass avatar
  [cx, cy] = await center(p, '[data-guide="pass"]'); await tap(p, cx, cy);
  await waitStep(p, 8, 'tap Pass');
  ok(/calendar/.test(p.url()), 'step 8 is on Calendar');
  ok(await p.locator('.guide-next[data-primary]').count() === 1 && (await p.locator('.guide-next').innerText()) === 'Finish', 'step 8 has Next/Finish only');
  await p.locator('.guide-next').click(); await sleep(400);
  ok(await p.locator('.guide-end').count() === 1, 'end card shown');
  await p.locator('.guide-end .guide-next').click(); await sleep(800);
  ok((await p.locator('.guide').count()) === 0, 'guide gone after Done');
  await p.evaluate(() => { location.hash = '#/dashboard'; }); await sleep(800);
  const fin = await link(p).catch(() => '?'); console.log('   final link:', fin);
  ok(/Florentina/.test(fin) && /Last Ferry/.test(fin), 'link restored after finish');
  await p.reload(); await sleep(3000);
  ok((await p.locator('.guide').count()) === 0, 'reload does not show guide again');
  // replay from Settings
  await p.goto(base + '#/settings'); await sleep(1200);
  await p.getByText('Show the guide again').click(); await sleep(1200);
  ok((await count(p)) === '1 / 8', 'Settings replay starts the guide');
  ok(!p.errs.length, 'no console errors ' + JSON.stringify(p.errs.slice(0, 3)));
  await p.context().close();

  // Skip and Esc restore the original link
  for (const how of ['Skip', 'Esc']) {
    const q = await open(b, { done: false });
    await waitStep(q, 1, how + ' run');
    await waitStep(q, 1, how);
    // walk to a switched state: step through to 3, swipe person
    await q.locator('.guide-next').click(); await sleep(300); await q.locator('.guide-next').click(); await sleep(400);
    let [x, y] = await center(q, '[data-guide="who"]');
    await swipe(q, [x, y + 20], [x, y - 40]); await sleep(1200);
    const sw = await link(q);
    if (how === 'Skip') await q.locator('.guide-skip').click(); else await q.keyboard.press('Escape');
    await sleep(1000);
    const back = await link(q);
    ok((await q.locator('.guide').count()) === 0, `${how} ends the tour`);
    ok(/Florentina/.test(back) && /Last Ferry/.test(back), `${how} restores original link (was "${sw}", now "${back}")`);
    await q.context().close();
  }
}

async function regress(b) {
  console.log(`== regression ${W}x${H}`);
  const p = await open(b, { done: true });
  ok((await p.locator('.guide').count()) === 0, 'guide not shown when done');
  const txt = () => p.evaluate(() => document.body.innerText);
  let t = await txt();
  ok(/UP NEXT/i.test(t) && /12:05/.test(t) && /VIE/.test(t) && /FNC/.test(t), 'front card is the flight (UP NEXT, 12:05, VIE, FNC)');
  ok(/in 3 h 35 min/.test(t), 'flight says in 3 h 35 min');
  const [cx, cy] = await center(p, '[data-guide="deck"]');
  // vertical drag from the card scrolls, deck stays
  const deckTxt = () => p.locator('[data-guide="deck"]').innerText();
  const d0 = await deckTxt(), sy0 = await p.evaluate(() => [...document.querySelectorAll('*')].map((e) => e.scrollTop).reduce((a, b) => a + b, 0));
  await swipe(p, [cx, cy + 30], [cx, cy - 150], 14); await sleep(400);
  const sy1 = await p.evaluate(() => [...document.querySelectorAll('*')].map((e) => e.scrollTop).reduce((a, b) => a + b, 0));
  ok((await deckTxt()) === d0, 'vertical drag on card does not move the deck');
  console.log('   scroll sum', sy0, '->', sy1, '(page may not be scrollable at this height)');
  await p.evaluate(() => [...document.querySelectorAll('*')].forEach((e) => (e.scrollTop = 0))); await sleep(300);
  // collect every deck card for "undefined"
  const [dx, dy] = await center(p, '[data-guide="deck"]');
  const seen = new Set();
  for (let i = 0; i < 8; i++) {
    const tt = await txt(); ok(!/undefined|NaN/.test(tt), `no undefined/NaN on deck card ${i}`);
    seen.add(await deckTxt());
    await swipe(p, [dx + 100, dy], [dx - 100, dy]); await sleep(500);
  }
  console.log('   distinct deck cards seen:', seen.size);
  await p.reload(); await sleep(3000);
  // header swipes
  const undoCount = () => p.getByRole('button', { name: /undo/i }).count();
  const l0 = await link(p);
  let [x, y] = await center(p, '[data-guide="who"]');
  await swipe(p, [x, y + 20], [x, y - 40]); await sleep(600);
  const l1 = await link(p);
  ok(l1 !== l0, `vertical swipe switches person: "${l0}" -> "${l1}"`);
  ok((await undoCount()) === 1, 'exactly one Undo after person switch');
  ok((await p.locator('.toast, [class*="pill"]').filter({ hasText: /undo/i }).count()) <= 1, 'single pill');
  if (shots) await p.screenshot({ path: `${shots}/regress-person-${W}.png` });
  await p.getByRole('button', { name: /undo/i }).first().click(); await sleep(700);
  ok((await link(p)) === l0, 'Undo restores previous link');
  [x, y] = await center(p, '[data-guide="who"]');
  await swipe(p, [x + 80, y], [x - 80, y]); await sleep(600);
  const l2 = await link(p); ok(l2 !== l0, `horizontal swipe switches project: "${l0}" -> "${l2}"`);
  ok((await undoCount()) === 1, 'exactly one Undo after project switch');
  await p.getByRole('button', { name: /undo/i }).first().click(); await sleep(700);
  ok((await link(p)) === l0, 'Undo restores project');
  // ruler resets to Now after a switch
  [x, y] = await center(p, '[data-guide="ruler"]');
  await swipe(p, [x + 60, y], [x - 90, y], 14); await sleep(500);
  const rulerState = () => p.locator('[data-guide="ruler"]').evaluate((e) => e.innerText.replace(/\s+/g, ' ') + '|' + e.dataset.preview);
  const r0 = await rulerState(); ok(/true/.test(r0.split('|')[1]), 'ruler is scrubbed (preview) before switch');
  [x, y] = await center(p, '[data-guide="who"]');
  await swipe(p, [x, y + 20], [x, y - 40]); await sleep(1000);
  const r1 = await rulerState(); ok(!/true/.test(r1.split('|')[1]), 'ruler back to Now after switch: ' + r1.slice(0, 80));
  // dock
  const dock = await p.evaluate(() => [...document.querySelectorAll('.dock-btn')].map((e) => e.innerText + ' ' + (e.getAttribute('aria-label') || '')).join(' | '));
  ok(/Home/.test(dock) && /Calendar/.test(dock) && /Your pass/.test(dock), 'dock has Home/Calendar/Pass(avatar) ' + JSON.stringify(dock));
  ok((await p.locator('.dock-add').count()) === 1, 'dock has +');
  [x, y] = await center(p, '[data-guide="pass"]'); await tap(p, x, y); await sleep(700);
  const pass = await txt(); ok(['Documents', 'Contacts', 'Settings', 'Notification'].every((s) => pass.includes(s)), 'Pass opens Documents/Contacts/Settings/Notifications');
  if (shots) await p.screenshot({ path: `${shots}/regress-pass-${W}.png` });
  ok(!p.errs.length, 'no console errors ' + JSON.stringify(p.errs.slice(0, 3)));
  await p.context().close();
}

(async () => {
  const b = await chromium.launch();
  try { await guideRun(b); await regress(b); } catch (e) { fails++; console.log('FAIL exception', e.message.split('\n')[0]); }
  await b.close();
  console.log(fails ? `FAIL: ${fails}` : 'PASS');
  process.exit(fails ? 1 : 0);
})();
