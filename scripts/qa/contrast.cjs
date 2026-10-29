// WCAG text-contrast audit of the running app (npm run dev). Exits 1 on any failure.
// usage: node scripts/qa/contrast.cjs [width]; BASE overrides the URL, PLAYWRIGHT the module path.
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
const base = process.env.BASE || 'http://127.0.0.1:5173/';
const w = +(process.argv[2] || 375);
const views = [
  ['dashboard', '#/dashboard'], ['calendar', '#/calendar'], ['documents', '#/documents'],
  ['contacts', '#/contacts'], ['settings', '#/settings'],
  ['note-sheet', '#/note/fl'], ['pdf', '#/pdf/Ticket_OS487.pdf'],
  ['log-sheet', '#/dashboard', '.quick-tile'], ['invoice', '#/dashboard', '.quick-tile:last-child'],
  ['month', '#/calendar', '.cal-label'],
];
const audit = () => {
  const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const over = (top, bot) => ({ r: top.r * top.a + bot.r * (1 - top.a), g: top.g * top.a + bot.g * (1 - top.a), b: top.b * top.a + bot.b * (1 - top.a), a: 1 });
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const bgOf = (el) => {
    const stack = []; let image = false;
    for (let n = el; n; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.backgroundImage !== 'none' && !/^url/.test(cs.backgroundImage)) image = true;
      const c = parse(cs.backgroundColor); if (c && c.a > 0) { stack.push(c); if (c.a >= 1) break; }
    }
    let bg = { r: 255, g: 255, b: 255, a: 1 };
    for (let i = stack.length - 1; i >= 0; i--) bg = over(stack[i], bg);
    return { bg, image };
  };
  const out = [];
  const walker = document.createTreeWalker(document.querySelector('.app') || document.body, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  while (walker.nextNode()) {
    const t = walker.currentNode; const el = t.parentElement;
    if (!t.textContent.trim() || seen.has(el)) continue; seen.add(el);
    if (el.closest('[inert], [aria-hidden="true"], .sr-only, .pdf-page')) continue;
    const r = el.getBoundingClientRect(); if (!r.width || r.bottom < 0 || r.top > innerHeight) continue;
    const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || +cs.opacity === 0) continue;
    let op = 1; for (let n = el; n; n = n.parentElement) op *= +getComputedStyle(n).opacity;
    const { bg, image } = bgOf(el); const fg0 = parse(cs.color); const fg = over({ ...fg0, a: fg0.a * op }, bg);
    const size = parseFloat(cs.fontSize), bold = +cs.fontWeight >= 700;
    const need = size >= 24 || (bold && size >= 18.66) ? 3 : 4.5;
    const cr = ratio(fg, bg);
    if (cr < need) out.push({ text: t.textContent.trim().slice(0, 40), cls: el.className.toString().slice(0, 40), cr: +cr.toFixed(2), need, image, disabled: op < 1 });
  }
  return out;
};
(async () => {
  const b = await chromium.launch();
  let fails = 0;
  for (const [name, hash, click] of views) {
    const p = await b.newPage({ viewport: { width: w, height: 812 } });
    // The first-visit guide would dim every view: mark it seen.
    await p.addInitScript(() => localStorage.setItem('crewser-guide-done', '1'));
    await p.goto(base + hash); await p.waitForTimeout(2600);
    let skip = false;
    for (const c of click ? [].concat(click) : []) { const el = p.locator(c).first(); if (await el.count()) { await el.click({ timeout: 3000 }).catch(() => {}); await p.waitForTimeout(900); } else { console.log(`${name}: SKIP no ${c}`); skip = true; break; } }
    if (skip) { await p.close(); continue; }
    const res = await p.evaluate(audit);
    const real = res.filter((r) => !r.image && !r.disabled);
    fails += real.length;
    console.log(`${name}: ${real.length} below AA` + (res.length - real.length ? ` (+${res.length - real.length} over gradient/disabled, check by eye)` : ''));
    for (const r of res) console.log('   ', r.image ? '[grad]' : r.disabled ? '[dim]' : '[FAIL]', r.cr, '<', r.need, JSON.stringify(r.text), r.cls);
    await p.close();
  }
  await b.close();
  console.log(fails ? `FAIL: ${fails} text nodes below AA` : 'PASS: no flat-background text below AA');
  process.exit(fails ? 1 : 0);
})();
