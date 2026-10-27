// Contrast of note-stub text over the sky gradient: hide the text, then compare it with the 95th-percentile
// brightest background pixel under each text box (grain specks excluded, gradient included).
// usage: node scripts/qa/stub-contrast.cjs; BASE overrides the URL, PLAYWRIGHT the module path. Exits 1 below 4.5:1.
const pw = process.env.PLAYWRIGHT || 'playwright';
const { chromium } = require(pw);
const base = process.env.BASE || 'http://127.0.0.1:5173/';
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 375, height: 1400 } });
  let worst = 99;
  for (const h of ['#/dashboard', '#/calendar']) {
    await p.goto(base + h); await p.reload(); await p.waitForTimeout(2600);
    await p.evaluate(() => { const s = [...document.querySelectorAll(".screen")].pop(); if (s) s.scrollTop = 0; }); const els = await p.$$('[data-accent="stub"] .stub-time, [data-accent="stub"] .stub-sub');
    const boxes = []; for (const e of els) { const bb = await e.boundingBox(); if (bb && bb.width && bb.height && bb.y >= 0 && bb.y + bb.height <= 1400) boxes.push({ bb, fg: await e.evaluate((n) => getComputedStyle(n).color), t: await e.innerText() }); }
    await p.addStyleTag({ content: '.stub-time,.stub-sub,.stub-time *,.stub-sub *{color:transparent!important;text-shadow:none!important}' });
    await p.waitForTimeout(200);
    for (const { bb, fg, t } of boxes) {
      const b64 = (await p.screenshot({ clip: bb })).toString('base64');
      const px = await p.evaluate(async (src) => {
        const img = new Image(); img.src = 'data:image/png;base64,' + src; await img.decode();
        const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
        const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0);
        return Array.from(ctx.getImageData(0, 0, c.width, c.height).data);
      }, b64);
      const Ls = []; const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
      for (let i = 0; i < px.length; i += 4) Ls.push(0.2126 * lin(px[i]) + 0.7152 * lin(px[i + 1]) + 0.0722 * lin(px[i + 2]));
      const [r, g, bl] = fg.match(/\d+/g).map(Number); const fl = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(bl);
      Ls.sort((a, b) => a - b); const maxL = Ls[Math.floor(Ls.length * 0.95)]; const cr = (fl + 0.05) / (maxL + 0.05); worst = Math.min(worst, cr);
      console.log(h, JSON.stringify(t), cr.toFixed(2));
    }
  }
  await b.close();
  console.log(worst >= 4.5 ? `PASS worst ${worst.toFixed(2)}` : `FAIL worst ${worst.toFixed(2)}`);
  process.exit(worst >= 4.5 ? 0 : 1);
})();
