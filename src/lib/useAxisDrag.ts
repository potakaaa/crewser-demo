import { useEffect, useRef, type PointerEvent, type MouseEvent } from 'react';

/** Movement before a gesture is judged along the axis (ours) or across it (the page's). */
const LOCK_PX = 10;

type Axis = 'x' | 'y';

interface Handlers {
  /** Distance along the claimed axis while the drag moves. */
  onDrag: (d: number, axis: Axis) => void;
  /** A claimed drag ended: distance, velocity in px/ms, whether the browser cancelled it, and the axis. */
  onRelease: (d: number, v: number, cancelled: boolean, axis: Axis) => void;
  enabled?: boolean;
}

/**
 * Direction lock shared by the deck and the header: after LOCK_PX the gesture is judged once, by its dominant
 * direction. If that is an axis we take ('both' takes either), it is claimed (pointer capture, and a non-passive
 * touchmove preventDefault so iOS Safari stops scrolling); otherwise it is dropped for good and nothing moves.
 * Pair it with the matching touch-action in CSS.
 */
export function useAxisDrag<T extends HTMLElement>(axes: Axis | 'both', h: Handlers) {
  const ref = useRef<T>(null);
  const g = useRef<{ x: number; y: number; axis: Axis | null; last: number; t: number; v: number } | null>(null);
  const swallow = useRef(false);
  const hr = useRef(h);
  hr.current = h;
  const along = (p: { clientX: number; clientY: number }, axis: Axis) => (axis === 'x' ? p.clientX : p.clientY);

  /** Settles a pending gesture: true once it is ours; one in a direction we don't take is dropped. */
  const lock = (dx: number, dy: number) => {
    const s = g.current;
    if (!s || s.axis) return !!s?.axis;
    if (Math.hypot(dx, dy) < LOCK_PX) return false;
    const dominant: Axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    if (axes === 'both' || axes === dominant) {
      s.axis = dominant;
      s.last = along({ clientX: s.x + dx, clientY: s.y + dy }, dominant);
      return true;
    }
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
    if (!s?.axis) return;
    // The click that ends a drag must not also tap what is under the finger.
    swallow.current = true;
    window.setTimeout(() => (swallow.current = false), 0);
    hr.current.onRelease(along(e, s.axis) - (s.axis === 'x' ? s.x : s.y), s.v, e.type === 'pointercancel', s.axis);
  };

  return {
    ref,
    handlers: {
      onPointerDown: (e: PointerEvent<T>) => {
        if (e.button !== 0 || hr.current.enabled === false) return;
        g.current = { x: e.clientX, y: e.clientY, axis: null, last: 0, t: e.timeStamp, v: 0 };
      },
      onPointerMove: (e: PointerEvent<T>) => {
        const s = g.current;
        if (!s) return;
        const wasOn = !!s.axis;
        if (!lock(e.clientX - s.x, e.clientY - s.y) || !s.axis) return;
        if (!wasOn) e.currentTarget.setPointerCapture(e.pointerId);
        const pos = along(e, s.axis);
        const dt = e.timeStamp - s.t;
        if (dt > 0) s.v = (pos - s.last) / dt;
        s.last = pos;
        s.t = e.timeStamp;
        hr.current.onDrag(pos - (s.axis === 'x' ? s.x : s.y), s.axis);
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
