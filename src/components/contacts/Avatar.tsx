/** Initials on a pale tint, so the ink letters stay readable. */
export function Avatar({ initials, tint, size = 44 }: { initials: string; tint: string; size?: number }) {
  return (
    <span className="cav" style={{ background: tint, width: size, height: size, fontSize: size >= 56 ? 16 : 14 }} aria-hidden="true">
      {initials}
    </span>
  );
}
