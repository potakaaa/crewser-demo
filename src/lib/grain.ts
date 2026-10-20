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
    document.documentElement.style.setProperty('--grain', `url(${canvas.toDataURL('image/png')})`);
  } catch {
    // No canvas (very old browser or a locked-down preview): the headers just stay clean.
  }
}
