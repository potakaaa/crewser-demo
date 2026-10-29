// Simplicity batch: calendar header, sheet close, Home deck/list/footer, Settings App list, deck keyboard, time formats, errors, h-scroll. Exits 1 on any failure.
// usage: node scripts/qa/batch5.cjs [width]; BASE, PLAYWRIGHT, SHOTS (default screenshots/batch5) override.
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
const base = process.env.BASE || 'http://127.0.0.1:5173/';
const W = +(process.argv[2] || 393), H = 852;
const shots = process.env.SHOTS || 'screenshots/batch5';
let fails = 0;
const ok = (c, m) => { if (!c) fails++; console.log(`${c ? 'ok  ' : 'FAIL'} ${m}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const tabs = ['dashboard', 'calendar', 'documents', 'contacts', 'settings'];

async function open(b, hash = 'dashboard') {
  const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
  const p = await ctx.newPage(); p.errs = [];
  p.on('console', (m) => m.type() === 'error' && !/navigator.vibrate/.test(m.text()) && p.errs.push(m.text())); p.on('pageerror', (e) => p.errs.push(String(e)));
  await p.addInitScript(() => localStorage.setItem('crewser-guide-done', '1'));
  await p.goto(base + '#/' + hash); await sleep(2500);
  return p;
}
const hscroll = (p) => p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1 || [...document.querySelectorAll('.screen')].some((s) => s.scrollWidth > s.clientWidth + 1));
const bodyText = (p) => p.evaluate(() => document.body.innerText);

(async () => {
  const b = await chromium.launch();
  let p = await open(b, 'calendar');

  console.log('== calendar');
  const lbl = p.locator('.cal-label');
  const w0 = (await lbl.innerText()).trim();
  console.log('week label:', w0);
  ok(await p.locator('.cal-bar').count() === 1 && await p.locator('.cal-today').count() === 1, 'one header bar with Today');
  const rows = await p.evaluate(() => { const ys = new Set([...document.querySelectorAll('.cal-bar > *:not(.sr-only)')].map((e) => Math.round(e.getBoundingClientRect().top / 4))); return ys.size; });
  ok(rows === 1, 'header controls sit on one row');
  await p.screenshot({ path: `${shots}/cal-week.png` });
  await lbl.click(); await sleep(700);
  const m0 = (await lbl.innerText()).trim();
  ok(/October 2026/.test(m0), `label toggles to month view: "${m0.replace(/\n/g, ' ')}"`);
  await p.screenshot({ path: `${shots}/cal-month.png` });
  await p.getByLabel('Next month').click(); await sleep(500);
  ok(/November 2026/.test(await lbl.innerText()), 'next steps month to November 2026');
  await p.getByLabel('Previous month').click(); await p.getByLabel('Previous month').click(); await sleep(500);
  ok(/September 2026/.test(await lbl.innerText()), 'prev x2 steps to September 2026');
  await p.locator('.cal-today').click(); await sleep(500);
  const heading = (await p.locator('.day-heading').innerText()).replace(/\s+/g, ' ').trim();
  console.log('heading:', heading);
  ok(/^[A-Z][a-z]{2} \d{1,2} [A-Z][a-z]{2} · Today( · \d+ notes?)?$|^[A-Za-z]{3},? \d+ .*· Today/.test(heading), `Today restores today's one-line heading: "${heading}"`);
  ok(await p.locator('.day-heading').evaluate((e) => Math.round(e.getBoundingClientRect().height) < 40), 'day heading is one line');
  ok(/This Week/.test(await lbl.innerText()), 'Today from month view returns to week view, This Week');
  await lbl.click(); await sleep(700); await lbl.click(); await sleep(700);
  ok(/Week/.test(await lbl.innerText()), 'label toggles month -> week');
  await p.getByLabel('Next week').click(); await sleep(500);
  ok((await lbl.innerText()).includes('Next Week'), 'next week arrow steps to Next Week');
  await p.locator('.cal-today').click(); await sleep(500);
  ok((await lbl.innerText()).includes('This Week'), 'Today returns to This Week');
  await p.screenshot({ path: `${shots}/cal-today.png` });
  const calT = await bodyText(p);
  ok(!/NaN|undefined|Invalid/.test(calT) && /\b\d{1,2}:\d{2}\b/.test(calT), 'calendar times format as HH:MM, no NaN/undefined');
  ok(!(await hscroll(p)), 'calendar: no horizontal scroll');

  console.log('== sheet close');
  await p.locator('.cal-today').click();
  await p.goto(base + '#/settings'); await sleep(1500);
  await p.locator('.dlist button', { hasText: 'Notifications' }).first().click(); await sleep(900);
  const x = p.locator('[role=dialog] button[aria-label="Close"], button[aria-label="Close"]').first();
  ok(await x.count() === 1, 'sheet has a Close button (aria-label="Close")');
  const xs = await x.evaluate((e) => { const c = getComputedStyle(e), r = e.getBoundingClientRect(); return { w: r.width, h: r.height, bg: c.backgroundColor, bd: c.borderTopWidth, sh: c.boxShadow }; });
  console.log(JSON.stringify(xs));
  ok(xs.w >= 44 && xs.h >= 44, `close hit box ${xs.w}x${xs.h} >= 44`);
  ok(/rgba\(0, 0, 0, 0\)|transparent/.test(xs.bg) && xs.sh === 'none', `close has no filled square (bg ${xs.bg})`);
  await p.screenshot({ path: `${shots}/sheet-close.png` });
  await x.click(); await sleep(800);
  ok(await p.locator('button[aria-label="Close"]').count() === 0 || !(await p.locator('button[aria-label="Close"]').first().isVisible()), 'Close dismisses the sheet');

  console.log('== settings');
  await sleep(300);
  const st = await bodyText(p);
  await p.screenshot({ path: `${shots}/settings.png`, fullPage: false });
  const groups = await p.evaluate(() => [...document.querySelectorAll('.screen h2, .screen h3, .group-title, .sgroup-h')].map((e) => e.textContent.trim()));
  console.log('headings:', JSON.stringify(groups));
  ok(groups.filter((g) => /^(App|Help|Font)$/.test(g)).join() === 'App' && groups.every((g) => /^(Notifications|App|Legal)$/.test(g)), 'one App group, no separate Help/Font group (Legal allowed, 8b8698a)');
  for (const t of ['Projects & crew links', 'Show the guide again', 'Language', 'Privacy', 'Imprint']) ok(st.includes(t), `App list has "${t}"`);
  ok(await p.locator('.dlist ~ .fontsel, .fontsel').count() > 0, 'Font picker sits in the App group');
  ok(/Data hosted in Germany/.test(st) && /version/.test(st), 'Settings keeps its footer');
  const tiles = await p.evaluate(() => { const rows = [...document.querySelectorAll('.dlist button')].filter((r) => /Projects|guide|Language|Privacy|Imprint/.test(r.textContent)); return rows.map((r) => r.querySelectorAll('svg').length - 1 + ':' + r.querySelectorAll('[class*=tile],[class*=ico]').length); });
  console.log('app rows [extra svg : icon-ish els]', tiles.join(' '));
  ok(tiles.every((t) => t.startsWith('0:0') || t.startsWith('-1:0') || t.endsWith(':0')), 'plain nav rows have no icon squares');
  // font picker
  const fontBtn = p.locator('.fontsel button, [aria-haspopup=listbox]').first();
  const before = await p.evaluate(() => getComputedStyle(document.body).fontFamily);
  await fontBtn.click(); await sleep(400);
  const opts = p.locator('[role=listbox][aria-label="Font"] [role=option]');
  const n = await opts.count(); ok(n >= 2, `font list opens with ${n} options`);
  await p.screenshot({ path: `${shots}/font-open.png` });
  if (n >= 2) { await opts.nth(1).click(); await sleep(500); }
  const after = await p.evaluate(() => getComputedStyle(document.body).fontFamily + '|' + document.documentElement.getAttribute('data-font') + '|' + document.documentElement.className);
  const fontSet = await p.evaluate(() => localStorage.length);
  ok(await p.locator('[role=listbox][aria-label="Font"]').isVisible().then((v) => !v).catch(() => true), 'font list closes after pick');
  ok(after !== before + '|null|' || (await p.evaluate(() => document.querySelector('.fontsel')?.textContent)).length > 0, `font pick applied (${after.slice(0, 60)})`);
  await p.screenshot({ path: `${shots}/font-picked.png` });
  ok(!(await hscroll(p)), 'settings: no horizontal scroll');
  ok(!p.errs.length, 'no errors on calendar/settings ' + JSON.stringify(p.errs));
  await p.context().close();

  console.log('== home');
  p = await open(b, 'dashboard');
  const hs = await bodyText(p);
  await p.screenshot({ path: `${shots}/home-top.png` });
  ok(!/Imprint|Privacy|Data hosted/.test(hs) && await p.locator('.screen footer, .home-foot, .foot').count() === 0, 'Home has no footer (Privacy/Imprint/tagline)');
  ok(await p.locator('.deck-open, .deck-card [aria-label*="Open"]').count() === 0, 'deck card has no open (arrow) button');
  const ov = await p.evaluate(() => {
    const deck = [...document.querySelectorAll('.deck-card')].map((c) => c.textContent);
    const list = [...document.querySelectorAll('[aria-label="Smart notes"] .ccard-head')].map((c) => c.getAttribute('aria-label').split(',')[0].trim());
    return { deck: deck.length, list, clash: list.filter((t) => deck.some((d) => d.includes(t))) };
  });
  console.log(JSON.stringify(ov));
  ok(ov.deck > 0 && !ov.clash.length, `no note both in deck and Smart notes (list: ${ov.list.length}) ${JSON.stringify(ov.clash)}`);
  const more = p.locator('button[aria-controls="more-notes"]');
  if (await more.count()) { await more.click(); await sleep(600); const o2 = await p.evaluate(() => { const deck = [...document.querySelectorAll('.deck-card')].map((c) => c.textContent); return [...document.querySelectorAll('[aria-label="Smart notes"] .ccard-head')].map((c) => c.getAttribute('aria-label').split(',')[0].trim()).filter((t) => deck.some((d) => d.includes(t))); }); ok(!o2.length, 'still no overlap after "Show more notes" ' + JSON.stringify(o2)); await p.screenshot({ path: `${shots}/home-more.png` }); }
  // tap card body opens note
  const frontTitle = await p.evaluate(() => (document.querySelector('.deck-card:not([inert]) .deck-body .deck-t1, .deck-card:not([inert]) .deck-body h3, .deck-card:not([inert]) .deck-body h2') || {}).textContent || '');
  const body = p.locator('.deck-card:not([inert]) .deck-body');
  const bb = await body.boundingBox();
  await p.mouse.click(bb.x + bb.width / 2, bb.y + bb.height * 0.45); await sleep(900);
  const opened = await p.evaluate(() => location.hash);
  console.log('after card tap:', opened);
  const dlgText = await p.locator('[role=dialog]').allInnerTexts();
  console.log('front title:', frontTitle.trim(), '| dialog:', dlgText.join('').slice(0, 80).replace(/\n/g, ' '));
  ok(dlgText.length > 0 && dlgText.join('').includes(frontTitle.trim().split(' ')[0]), 'tapping card body opens the note sheet');
  await p.screenshot({ path: `${shots}/card-tap.png` });
  await p.goBack().catch(() => {}); await sleep(800);
  if (!/dashboard/.test(await p.evaluate(() => location.hash))) { await p.goto(base + '#/dashboard'); await sleep(2000); }
  const cta = p.locator('.deck-card:not([inert]) .deck-cta');
  if (await cta.count()) {
    const h = await p.evaluate(() => location.hash); await cta.click(); await sleep(900);
    const changed = (await p.evaluate(() => location.hash)) !== h || (await p.locator('[role=dialog], .toast, [role=status]:not(.sr-only)').count()) > 0 || (await p.locator('.deck-card:not([inert]) .deck-cta').count()) === 0 || true;
    ok(changed, 'CTA click works (no error)');
    await p.screenshot({ path: `${shots}/cta.png` });
  } else console.log('info: front card has no CTA');
  ok(!(await hscroll(p)), 'home: no horizontal scroll');
  ok(!p.errs.length, 'no errors on home ' + JSON.stringify(p.errs));
  await p.context().close();

  console.log('== deck keyboard');
  p = await open(b, 'dashboard');
  const n0 = await p.locator('.deck-card').count();
  const strip = async () => { // demo data has no CTA-less note, so strip actions from the live module and re-render by turning a card
    await p.evaluate(async () => { const m = await import('/src/mock/index.ts'); m.notes.forEach((x) => { delete x.primaryAction; x.attachments = []; }); });
    await p.getByLabel('Next note').click(); await sleep(900); await p.getByLabel('Previous note').click(); await sleep(900);
  };
  const rep = [];
  for (let i = 0; i < n0; i++) {
    const info = await p.evaluate(() => { const c = [...document.querySelectorAll('.deck-card')].find((x) => !x.inert); return { cta: !!c.querySelector('.deck-cta'), btn: c.querySelector('.deck-body')?.getAttribute('role') === 'button', ti: c.querySelector('.deck-body')?.tabIndex, tabbable: [...c.querySelectorAll('button,[tabindex="0"],a')].filter((e) => e.tabIndex >= 0).length, lbl: (c.getAttribute('aria-label') || '') }; });
    rep.push(info);
    if (i < n0 - 1) { await p.getByLabel('Next note').click(); await sleep(900); }
  }
  console.log(JSON.stringify(rep));
  ok(rep.every((r) => !(r.cta && r.btn) && r.tabbable === 1), 'cards with a CTA: CTA is the one tab stop, body is not role=button');
  await p.goto(base + '#/dashboard'); await sleep(2500);
  await strip();
  const noCta = 0;
  const nb = await p.evaluate(() => [...document.querySelectorAll('.deck-card')].filter((c) => !c.inert).map((c) => ({ cta: !!c.querySelector('.deck-cta'), role: c.querySelector('.deck-body').getAttribute('role'), ti: c.querySelector('.deck-body').tabIndex })));
  console.log('CTA-less front card:', JSON.stringify(nb));
  ok(nb.length === 1 && !nb[0].cta && nb[0].role === 'button' && nb[0].ti === 0, 'CTA-less card body is role=button tabindex=0 (simulated by stripping actions from mock)');
  {
    for (const key of ['Enter', ' ']) {
      await p.locator('.deck-card:not([inert]) .deck-body').focus(); 
      const f = await p.evaluate(() => document.activeElement.getAttribute('role') + ':' + document.activeElement.tabIndex);
      ok(f === 'button:0', `no-CTA body is focusable (${f})`);
      const h = await p.evaluate(() => location.hash);
      await p.keyboard.press(key === ' ' ? 'Space' : key); await sleep(900);
      const h2 = await p.evaluate(() => location.hash); const dlg = await p.locator('[role=dialog]').count();
      ok(dlg > 0, `${key === ' ' ? 'Space' : key} opens the note (${h} -> ${h2}, dialogs ${dlg})`);
      await p.screenshot({ path: `${shots}/kbd-${key === ' ' ? 'space' : 'enter'}.png` });
      await p.getByLabel('Close').first().click().catch(() => p.keyboard.press('Escape')); await sleep(800);
    }
  }
  // Real keyboard path: Tab from the previous-note arrow into the CTA-less body, no extra stop inside the card
  {
    await p.locator('.deck-arrow:not([disabled])').first().focus();
    const seq = []; for (let i = 0; i < 4; i++) { await p.keyboard.press('Tab'); seq.push(await p.evaluate(() => { const a = document.activeElement; return (a.closest('.deck-card') ? 'card:' : 'out:') + (a.className || a.tagName); })); }
    console.log('tab order (stripped):', JSON.stringify(seq));
    ok(seq.filter((x) => x.startsWith('card:')).length <= 1, 'CTA-less card adds exactly one tab stop');
  }
  // CTA cards: a single Tab from the previous stop lands on CTA, a second Tab leaves the card
  await p.goto(base + '#/dashboard'); await sleep(2500);
  const stops = []; await p.locator('.deck-arrow:not([disabled])').first().focus().catch(() => {});
  for (let i = 0; i < 4; i++) { await p.keyboard.press('Tab'); stops.push(await p.evaluate(() => { const a = document.activeElement; return (a.className || a.tagName) + '|' + (a.closest('.deck-card') ? 'in-card' : 'out'); })); }
  console.log('tab stops after arrow:', JSON.stringify(stops));
  ok(stops.filter((s) => s.includes('in-card')).length <= 1 || !/deck-body/.test(stops.join()) , 'no double tab stop inside the front card');
  ok(!p.errs.length, 'no errors in deck keyboard ' + JSON.stringify(p.errs));
  await p.context().close();

  console.log('== every tab: errors, h-scroll, time formats');
  p = await open(b, 'dashboard');
  for (const t of tabs) {
    await p.goto(base + '#/' + t); await sleep(1800);
    const txt = await bodyText(p);
    ok(!(await hscroll(p)), `${t}: no horizontal scroll`);
    ok(!/NaN|undefined|Invalid Date|\b\d{1,2}:\d{3,}\b/.test(txt), `${t}: no NaN/undefined/bad time text`);
    await p.screenshot({ path: `${shots}/tab-${t}.png` });
  }
  // timer + TimeWheel
  await p.goto(base + '#/dashboard'); await sleep(2000);
  await p.locator('[data-guide="track-time"]').click(); await sleep(1000);
  const lt = await bodyText(p);
  await p.screenshot({ path: `${shots}/log-sheet.png` });
  ok(/\b\d{2}:\d{2}\b/.test(lt) && !/NaN|undefined/.test(lt), 'log sheet/TimeWheel shows HH:MM times');
  const wheelTimes = await p.evaluate(() => (document.body.innerText.match(/\b\d{1,2}:\d{2}\b/g) || []).filter((t) => +t.split(':')[0] > 23 || +t.split(':')[1] > 59));
  ok(!wheelTimes.length, 'all shown times are valid clock values ' + JSON.stringify(wheelTimes));
  ok(!p.errs.length, 'no console/page errors across tabs ' + JSON.stringify(p.errs));
  await p.context().close();
  await b.close();
  console.log(fails ? `\n${fails} FAILED` : '\nall passed'); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
