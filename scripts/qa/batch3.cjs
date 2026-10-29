// Calendar badge clipping + Home stats sheets, dark and light. Exits 1 on any failure.
// usage: node scripts/qa/batch3.cjs [width]; BASE, PLAYWRIGHT, SHOTS (default screenshots/batch3) override.
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
const base = process.env.BASE || 'http://127.0.0.1:5173/';
const W = +(process.argv[2] || 393), H = 852;
const shots = process.env.SHOTS || 'screenshots/batch3';
let fails = 0;
const ok = (c, m) => { if (!c) fails++; console.log(`${c ? 'ok  ' : 'FAIL'} ${m}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// badge rect vs every clipping ancestor
const clip = (sel) => [...document.querySelectorAll(sel)].filter((b) => b.getBoundingClientRect().width).map((b) => {
  const r = b.getBoundingClientRect(); const bad = [];
  for (let n = b.parentElement; n && n !== document.documentElement; n = n.parentElement) {
    const cs = getComputedStyle(n);
    if (/hidden|auto|scroll|clip/.test(cs.overflow + cs.overflowX + cs.overflowY)) {
      const a = n.getBoundingClientRect();
      if (r.top < a.top - 0.5 || r.left < a.left - 0.5 || r.right > a.right + 0.5 || r.bottom > a.bottom + 0.5) bad.push(`${n.className.toString().slice(0, 30)} top ${(r.top - a.top).toFixed(1)}`);
    }
  }
  return bad;
});

(async () => {
  const b = await chromium.launch();
  for (const theme of ['dark', 'light']) {
    const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: true, isMobile: true });
    const p = await ctx.newPage(); const errs = [];
    p.on('console', (m) => m.type() === 'error' && errs.push(m.text())); p.on('pageerror', (e) => errs.push(String(e)));
    await p.addInitScript((t) => { localStorage.setItem('crewser-guide-done', '1'); }, theme);
    const dark = () => p.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
    console.log(`== ${theme} ${W}`);
    await p.goto(base + '#/calendar'); await sleep(2500); await dark(); await sleep(300);
    let n = await p.locator('.week-strip .day-badge').count(); let bad = (await p.evaluate(clip, '.week-strip .day-badge')).flat();
    ok(n > 0 && !bad.length, `week strip: ${n} badges, none clipped ${JSON.stringify(bad)}`);
    await p.screenshot({ path: `${shots}/cal-week-${theme}.png` });
    await p.locator('.cal-label').click(); await sleep(900);
    n = await p.locator('.month .day-badge').count(); bad = (await p.evaluate(clip, '.month .day-badge')).flat();
    ok(n > 0 && !bad.length, `month grid: ${n} badges, none clipped ${JSON.stringify(bad)}`);
    await p.screenshot({ path: `${shots}/cal-month-${theme}.png` });

    await p.goto(base + '#/dashboard'); await sleep(2500); await dark();
    ok((await p.locator('.hs-timer, .stats :text("Start timer")').count()) === 0, 'no Start timer in Statistics');
    const card = {};
    for (const m of ['week', 'overtime', 'days']) {
      const row = p.locator(`.st-row[data-metric="${m}"]`); await row.scrollIntoViewIfNeeded();
      card[m] = (await row.locator('.st-v').innerText()).replace(/\s+/g, ' ').trim();
      await row.click(); await sleep(900);
      const sh = p.locator('.hsheet-hero').locator('xpath=ancestor::*[contains(@class,"sheet")][1]');
      const hero = (await p.locator('.hsheet-v').innerText()).replace(/\s+/g, ' ').trim();
      const label = (await p.locator('.hsheet-k').innerText()).trim();
      const rows = await p.locator('.hsheet-row').allInnerTexts();
      const body = await p.locator('.hsheet-hero').evaluate((e) => e.parentElement.innerText.replace(/\s+/g, ' '));
      console.log(`   ${m}: card="${card[m]}" sheet="${label}: ${hero}" rows=${rows.length} first=${JSON.stringify(rows[0])}`);
      ok(hero === card[m], `${m}: sheet number matches card`);
      ok(rows.every((r) => /^[A-Za-z]{3} \d+ [+]?[\d.,]+ h$/.test(r.replace(/\s+/g, ' ').trim())), `${m}: rows are just day + hours`);
      const extras = await p.locator('.hsheet-hero').evaluate((e) => e.parentElement.querySelectorAll('[class*=pill], [class*=nudge], .chip').length);
      ok(!/sent|draft|pending|nudge|\d{1,2}:\d{2}|–\s*\d/.test(rows.join(' ')) && extras === 0 && body.replace(/\s+/g, ' ').trim() === [label, hero, ...rows.map((r) => r.replace(/\s+/g, ' '))].join(' '), `${m}: no pills/times/nudge, no sentences (${body.split(' ').length} words)`);
      if (m === 'days') {
        const sub = await p.locator('[class*="sheet-sub"], .sheet-subtitle, .sheet-head p').allInnerTexts();
        ok(/^\d+ of \d+$/.test(hero), `days hero "${hero}"`); ok(!sub.some((s) => /\d+ of \d+/.test(s)), `days subtitle does not repeat: ${JSON.stringify(sub)}`);
      }
      await p.screenshot({ path: `${shots}/sheet-${m}-${theme}.png` });
      await p.keyboard.press('Escape'); await sleep(600);
      if (await p.locator('.hsheet-hero').count()) { await p.mouse.click(W / 2, 40); await sleep(600); }
    }
    await p.screenshot({ path: `${shots}/home-stats-${theme}.png` });
    const empty = await p.locator('.st-empty').count();
    if (empty) ok(/Track time/.test(await p.locator('.st-empty').innerText()) && !/timer/i.test(await p.locator('.st-empty').innerText()), 'empty copy mentions Track time, not timer');
    ok(!errs.length, 'no console errors ' + JSON.stringify(errs.slice(0, 3)));
    await ctx.close();
  }
  await b.close();
  console.log(fails ? `FAIL: ${fails}` : 'PASS'); process.exit(fails ? 1 : 0);
})();
