import { useEffect, useRef, type PointerEvent, type MouseEvent } from 'react';

/** Movement before a gesture is judged along the axis (ours) or across it (the page's). */
const LOCK_PX = 10;

interface Handlers {
  /** Distance along the axis while a claimed drag moves. */
  onDrag: (d: number) => void;
  /** A claimed drag ended: distance, velocity in px/ms, and whether the browser cancelled it. */
  onRelease: (d: number, v: number, cancelled: boolean) => void;
  enabled?: boolean;
}

/**
 * Direction lock shared by the deck and the header: after LOCK_PX the gesture is judged once. Along the axis it is
 * claimed (pointer capture, and a non-passive touchmove preventDefault so iOS Safari stops scrolling); across it,
 * it is dropped for good and nothing moves. Pair it with the matching touch-action in CSS.
 */
export function useAxisDrag<T extends HTMLElement>(axis: 'x' | 'y', h: Handlers) {
  const ref = useRef<T>(null);
  const g = useRef<{ x: number; y: number; on: boolean; last: number; t: number; v: number } | null>(null);
  const swallow = useRef(false);
  const hr = useRef(h);
  hr.current = h;
  const along = (p: { clientX: number; clientY: number }) => (axis === 'x' ? p.clientX : p.clientY);

  /** Settles a pending gesture: true once it is ours; a cross-axis one is dropped. */
  const lock = (dx: number, dy: number) => {
    const s = g.current;
    if (!s || s.on) return !!s?.on;
    if (Math.hypot(dx, dy) < LOCK_PX) return false;
    const [main, cross] = axis === 'x' ? [dx, dy] : [dy, dx];
    if (Math.abs(main) > Math.abs(cross)) return (s.on = true);
    g.current = null;
    return false;
  };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onTouchMove = (e: TouchEvent) => {
      const s = g.current;
      const t = e.touches[0];
      if (s && t && lock(t.clientX - s.x, t.clientY - s.y) && e.cancelable) e.preventDefault();
    };
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => el.removeEventListener('touchmove', onTouchMove);
  });

  const end = (e: PointerEvent<T>) => {
    const s = g.current;
    g.current = null;
    if (!s?.on) return;
    // The click that ends a drag must not also tap what is under the finger.
    swallow.current = true;
    window.setTimeout(() => (swallow.current = false), 0);
    hr.current.onRelease(along(e) - (axis === 'x' ? s.x : s.y), s.v, e.type === 'pointercancel');
  };

  return {
    ref,
    handlers: {
      onPointerDown: (e: PointerEvent<T>) => {
        if (e.button !== 0 || hr.current.enabled === false) return;
        g.current = { x: e.clientX, y: e.clientY, on: false, last: along(e), t: e.timeStamp, v: 0 };
      },
      onPointerMove: (e: PointerEvent<T>) => {
        const s = g.current;
        if (!s) return;
        const wasOn = s.on;
        if (!lock(e.clientX - s.x, e.clientY - s.y)) return;
        if (!wasOn) e.currentTarget.setPointerCapture(e.pointerId);
        const dt = e.timeStamp - s.t;
        if (dt > 0) s.v = (along(e) - s.last) / dt;
        s.last = along(e);
        s.t = e.timeStamp;
        hr.current.onDrag(along(e) - (axis === 'x' ? s.x : s.y));
      },
      onPointerUp: end,
      onPointerCancel: end,
      onClickCapture: (e: MouseEvent<T>) => {
        if (!swallow.current) return;
        e.preventDefault();
        e.stopPropagation();
      },
    },
  };
}
