// Deterministic, scannable-looking (but fake) 29 × 29 QR pattern with the three finder squares.

export const QR_SIZE = 29;

export function fakeQr(seed = 4871): boolean[] {
  let s = seed;
  const rnd = () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
  const finder = (r: number, c: number, R: number, C: number): boolean | null => {
    const y = r - R;
    const x = c - C;
    if (y < 0 || x < 0 || y > 6 || x > 6) return null;
    if (y === 0 || y === 6 || x === 0 || x === 6) return true;
    return y >= 2 && y <= 4 && x >= 2 && x <= 4;
  };
  const end = QR_SIZE - 7;
  const cells: boolean[] = [];
  for (let r = 0; r < QR_SIZE; r++) {
    for (let c = 0; c < QR_SIZE; c++) {
      let v = finder(r, c, 0, 0) ?? finder(r, c, 0, end) ?? finder(r, c, end, 0);
      // Quiet separator around the finders.
      if (v === null && ((r <= 7 && c <= 7) || (r <= 7 && c >= end - 1) || (r >= end - 1 && c <= 7))) v = false;
      // Timing patterns.
      if (v === null && r === 6) v = c % 2 === 0;
      if (v === null && c === 6) v = r % 2 === 0;
      if (v === null) v = rnd() > 0.5;
      cells.push(v);
    }
  }
  return cells;
}

/** One SVG path for all dark modules, in module units. */
export function qrPath(cells: boolean[]): string {
  let d = '';
  cells.forEach((on, i) => {
    if (on) d += `M${i % QR_SIZE} ${Math.floor(i / QR_SIZE)}h1v1h-1z`;
  });
  return d;
}
