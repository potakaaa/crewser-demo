// Film grain like the Crewser photography: one small noise tile, generated once,
// exposed as --grain for the headers and dark tiles to overlay.
export function installGrain(size = 160) {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = ctx.createImageData(size, size);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random() * 255;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    const root = document.documentElement.style;
    root.setProperty('--grain', `url(${canvas.toDataURL('image/png')})`);
    // Same noise at low alpha, for blending inside one background stack.
    for (let i = 3; i < img.data.length; i += 4) img.data[i] = 46;
    ctx.putImageData(img, 0, 0);
    root.setProperty('--grain-soft', `url(${canvas.toDataURL('image/png')})`);
    root.setProperty('--dissolve', installDissolve());
    root.setProperty('--sparks', installSparks());
  } catch {
    // No canvas (very old browser or a locked-down preview): the headers just stay clean.
  }
}

const EDGE_W = 28;
const EDGE_H = 256;

/**
 * A dithered fade from solid (left) to clear (right): used as a mask, the brand
 * gradient breaks up into grain at its edge, like the edge of exposed film.
 */
function installDissolve() {
  // Drawn at 2x and shown at 1x, so specks match a retina pixel.
  const w = EDGE_W * 2;
  const h = EDGE_H * 2;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return 'none';
  const img = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const t = x / (w - 1);
      const keep = 1 - t * t * (3 - 2 * t); // smoothstep, so the solid side melts slowly
      // Soft threshold: specks fade in and out like grain; fully solid where keep = 1, so no seam.
      const a = Math.min(1, Math.max(0, (keep - Math.random()) * 2.4 + keep * keep));
      img.data[(y * w + x) * 4 + 3] = Math.round(a * 255);
    }
  }
  ctx.putImageData(img, 0, 0);
  return `url(${canvas.toDataURL('image/png')})`;
}

/** A few lime specks scattered around the dissolve, like light catching the grain. */
function installSparks() {
  const w = 44;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = EDGE_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return 'none';
  for (let i = 0; i < 26; i++) {
    const x = w * (0.2 + 0.7 * Math.random());
    const y = Math.random() * EDGE_H;
    ctx.fillStyle = `rgba(219, 242, 39, ${(0.35 + Math.random() * 0.5).toFixed(2)})`;
    ctx.fillRect(Math.round(x), Math.round(y), 1, Math.random() < 0.3 ? 2 : 1);
  }
  return `url(${canvas.toDataURL('image/png')})`;
}
