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
  for (let i = 0; i < 30; i++) { if ((await count(p)) === `${n} / ${N}`) return ok(true, `${label}: now at ${n} / ${N}`); await sleep(200); }
  ok(false, `${label}: expected ${n} / ${N}, got ${await count(p)}`);
}

const tapOn = async (p, sel) => { const [x, y] = await center(p, sel); await tap(p, x, y); };
const STEPS = [
  { name: 'deck swipe', go: async (p) => { const [x, y] = await center(p, '[data-guide="deck"]'); await swipe(p, [x + 100, y], [x - 100, y]); } },
  { name: 'ruler drag', go: async (p) => { const [x, y] = await center(p, '[data-guide="ruler"]'); await swipe(p, [x + 60, y], [x - 80, y], 14); } },
  { name: 'switch arrow tap', go: (p) => tapOn(p, '[data-guide="switch"]'),
    post: async (p) => { await sleep(300); ok((await p.locator('.switcher').count()) === 1, 'arrow opened the project switcher'); } },
  { name: 'track time tour step',
    pre: async (p) => { await sleep(600); const r = await p.locator('[data-guide="track-time"]').boundingBox(); ok(r && r.y > 0 && r.y + r.height < H - 56, `Track time scrolled into view above the dock (y ${r && Math.round(r.y)})`); },
    go: (p) => p.locator('.guide-next').click() },
  { name: 'tap Profile', go: (p) => tapOn(p, '[data-guide="profile"]') },
];
const N = STEPS.length;
async function guideRun(b) {
  console.log(`== guide ${W}x${H}`);
  const p = await open(b, { done: false });
  await waitStep(p, 1, 'auto-start');
  const start = await link(p); console.log('   start link:', start);
  ok(/Florentina/.test(start) && /Last Ferry/.test(start), 'starts on Focus Florentina · The Last Ferry');
  // overlay: dim covers all but the hole; touches outside blocked
  const geo = await p.evaluate(() => { const g = document.querySelector('.guide'), h = document.querySelector('.guide-hole'); const a = g.getBoundingClientRect(), r = h.getBoundingClientRect(); return { a: [a.width, a.height], h: [r.x, r.y, r.width, r.height] }; });
  ok(geo.a[0] >= W - 1 && geo.a[1] >= H - 1, `overlay covers viewport (${geo.a})`);
  const outside = await p.evaluate(() => { const bad = []; for (const [x, y] of [[5, 5], [180, innerHeight - 6], [5, 400], [innerWidth - 5, 400], [180, 30]]) { const e = document.elementFromPoint(x, y); if (!e || !e.closest('.guide-block, .guide-card')) bad.push([x, y, e && e.className]); } return bad; });
  ok(!outside.length, 'points outside cut-out hit the blocker/card ' + JSON.stringify(outside));
  const inside = await p.evaluate(() => { const r = document.querySelector('.guide-hole').getBoundingClientRect(); const e = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return !!e.closest('[data-guide="deck"]'); });
  ok(inside, 'inside cut-out reaches the deck');
  // blocked tap outside: tap Calendar tab -> route unchanged
  await tap(p, 120, H - 22); await sleep(300);
  ok(/dashboard/.test(p.url()) && (await count(p)) === `1 / ${N}`, 'tap on dock outside the hole is blocked');
  if (shots) await p.screenshot({ path: `${shots}/guide-1-${W}.png` });

  // Table-driven: one gesture per step, in tour order. Edit STEPS when the tour changes.
  let prev = await link(p);
  for (let i = 0; i < STEPS.length; i++) {
    const st = STEPS[i];
    await waitStep(p, i + 1, st.name);
    if (st.pre) await st.pre(p);
    await st.go(p);
    if (st.post) await st.post(p, prev);
    if (i < STEPS.length - 1) await waitStep(p, i + 2, `after ${st.name}`);
    prev = await link(p).catch(() => prev);
  }
  for (let i = 0; i < 30 && !(await p.locator('.guide-end').count()); i++) await sleep(200);
  ok(await p.locator('.guide-end').count() === 1, 'end card shown after the last step');
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
  ok((await count(p)) === `1 / ${N}`, 'Settings replay starts the guide');
  ok(!p.errs.length, 'no console errors ' + JSON.stringify(p.errs.slice(0, 3)));
  await p.context().close();

  // Skip and Esc end the tour and leave the link where it was
  for (const how of ['Skip', 'Esc']) {
    const q = await open(b, { done: false });
    await waitStep(q, 1, how);
    const before = await link(q);
    await q.locator('.guide-next').click(); await sleep(300); await q.locator('.guide-next').click(); await sleep(400);
    if (how === 'Skip') await q.locator('.guide-skip').click(); else await q.keyboard.press('Escape');
    await sleep(800);
    ok((await q.locator('.guide').count()) === 0, `${how} ends the tour`);
    ok((await link(q)) === before, `${how} leaves the link as it was`);
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
  for (let i = 0; i < 14; i++) {
    const tt = await txt(); ok(!/undefined|NaN/.test(tt), `no undefined/NaN on deck card ${i}`);
    seen.add(await deckTxt());
    await swipe(p, [dx + 100, dy], [dx - 100, dy]); await sleep(500);
  }
  console.log('   distinct deck cards seen:', seen.size);
  await p.reload(); await sleep(3000);
  // deck arrows: previous disabled at the start, next walks the deck, next disabled at the end
  const prev = p.getByRole('button', { name: 'Previous note' }), next = p.getByRole('button', { name: 'Next note' });
  const pos = () => p.locator('.deck-pos').innerText();
  ok(await prev.isDisabled(), 'previous arrow disabled on the first note');
  const p0 = await pos();
  await next.click(); await sleep(500);
  ok((await pos()) !== p0 && !(await prev.isDisabled()), `next arrow moves the deck (${p0} -> ${await pos()})`);
  await prev.click(); await sleep(500);
  ok((await pos()) === p0 && (await prev.isDisabled()), 'previous arrow goes back and disables again');
  for (let i = 0; i < 30 && !(await next.isDisabled()); i++) { await next.click(); await sleep(150); }
  ok(await next.isDisabled(), 'next arrow disabled on the last note: ' + (await pos()));
  await p.reload(); await sleep(3000);

  // the header: no swipe switching, no Start chip, an arrow that opens the switcher
  const l0 = await link(p);
  let [x, y] = await center(p, '.who-block');
  await swipe(p, [x, y + 20], [x, y - 40]); await swipe(p, [x + 80, y], [x - 80, y]); await sleep(600);
  ok((await link(p)) === l0, 'swiping the header does not switch');
  await p.evaluate(() => document.querySelectorAll('.screen').forEach((e) => (e.scrollTop = 0))); await sleep(300);
  ok((await p.locator('.timer-chip, .glass-btn:has-text("Start")').count()) === 0, 'no Start chip in the header');
  // the ruler resets to Now after a switch
  [x, y] = await center(p, '[data-guide="ruler"]');
  await swipe(p, [x + 60, y], [x - 90, y], 14); await sleep(500);
  const rulerState = () => p.locator('[data-guide="ruler"]').evaluate((e) => e.innerText.replace(/\s+/g, ' ') + '|' + e.dataset.preview);
  const r0 = await rulerState(); ok(/true/.test(r0.split('|')[1]), 'ruler is scrubbed (preview) before switch');
  await tapOn(p, '[data-guide="switch"]'); await sleep(600);
  ok((await p.locator('.switcher').count()) === 1, 'arrow opens the project switcher');
  await p.locator('.lrow:not(.is-active):not(.is-blocked)').first().click(); await sleep(900);
  await p.keyboard.press('Escape'); await sleep(500);
  const l1 = await link(p);
  ok(l1 !== l0, `picking a row switches: "${l0}" -> "${l1}"`);
  const r1 = await rulerState(); ok(!/true/.test(r1.split('|')[1]), 'ruler back to Now after switch: ' + r1.slice(0, 80));
  if (shots) await p.screenshot({ path: `${shots}/regress-switched-${W}.png` });

  // the two quick actions stay reachable from Home
  const quick = await p.locator('.quick').innerText();
  ok(/Track time/.test(quick) && /Scan invoice/.test(quick), 'Home keeps Track time and Scan invoice');
  ok((await p.locator('.hs-timer').count()) === 0, 'no Start timer button in Statistics');
  await p.locator('[data-guide="track-time"]').click(); await sleep(700);
  ok(/Start|End|Break|hours/i.test(await txt()), 'Track time opens the log');
  await p.reload(); await sleep(3000);

  // dock: five tabs, full width, docked, no + and no pass menu
  const labels = await p.evaluate(() => [...document.querySelectorAll('.dock-btn')].map((e) => e.getAttribute('aria-label')));
  ok(JSON.stringify(labels) === JSON.stringify(['Home', 'Calendar', 'Documents', 'Contacts', 'Profile and settings']), 'dock tabs in order ' + JSON.stringify(labels));
  ok((await p.locator('.dock-add, .tb-pass, .tb-dial').count()) === 0, 'no + button and no pass menu');
  const bar = await p.locator('.tabbar-wrap').boundingBox();
  ok(bar && bar.x === 0 && bar.width >= W - 1 && Math.abs(bar.y + bar.height - H) <= 1, `dock spans the phone and sits at the bottom (${JSON.stringify(bar)})`);
  if (shots) await p.screenshot({ path: `${shots}/regress-home-${W}.png` });
  for (const [name, hash] of [['Calendar', 'calendar'], ['Documents', 'documents'], ['Contacts', 'contacts'], ['Profile and settings', 'settings']]) {
    await p.getByRole('button', { name, exact: true }).click(); await sleep(600);
    ok(new RegExp(hash).test(p.url()), `${name} opens ${hash}`);
  }
  ok((await p.locator('.dock-btn[data-on]').getAttribute('aria-label')) === 'Profile and settings', 'Profile is the active tab on Settings');
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
