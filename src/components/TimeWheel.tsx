import { useEffect, useRef, type KeyboardEvent, type PointerEvent } from 'react';
import { pad2 } from '../lib/dates';

const ITEM_H = 36;
const SETTLE_MS = 90;
const DRAG_PX = 4;
/** How far a flick carries past the release, per px/ms of speed. */
const MOMENTUM_MS = 160;
const MAX_CARRY = ITEM_H * 6;

interface ColumnProps {
  label: string;
  values: number[];
  value: number;
  onChange: (v: number) => void;
}

/**
 * One looping scroll-snapping wheel (three copies of the values, recentred after each settle so
 * 23 runs on to 00). Scrolling, mouse drag, tapping an item and the arrow keys all pick a value;
 * the wheel only scrolls itself when the value changes from outside. Touch uses native scrolling.
 */
function WheelColumn({ label, values, value, onChange }: ColumnProps) {
  const ref = useRef<HTMLDivElement>(null);
  const settle = useRef(0);
  const fromScroll = useRef(false);
  const drag = useRef<{ y: number; top: number; t: number; v: number; moved: boolean } | null>(null);
  const swallow = useRef(false);
  const n = values.length;
  const index = Math.max(0, values.indexOf(value));

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (fromScroll.current) {
      fromScroll.current = false;
      return;
    }
    // The copy of the value nearest the current position, so 23 to 00 scrolls one step, not a whole lap.
    const span = n * ITEM_H;
    const from = el.dataset.ready ? el.scrollTop : span;
    const top = index * ITEM_H + Math.round((from - index * ITEM_H) / span) * span;
    el.scrollTo({ top, behavior: el.dataset.ready ? 'smooth' : 'auto' });
    el.dataset.ready = '1';
  }, [index]);

  useEffect(() => () => window.clearTimeout(settle.current), []);

  const onScroll = () => {
    window.clearTimeout(settle.current);
    settle.current = window.setTimeout(() => {
      const el = ref.current;
      if (!el || drag.current?.moved) return;
      const i = Math.round(el.scrollTop / ITEM_H);
      if (i < n || i >= 2 * n) el.scrollTop += (i < n ? n : -n) * ITEM_H;
      const v = values[((i % n) + n) % n];
      if (v !== value) {
        fromScroll.current = true;
        onChange(v);
      }
    }, SETTLE_MS);
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    drag.current = { y: e.clientY, top: e.currentTarget.scrollTop, t: e.timeStamp, v: 0, moved: false };
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const el = e.currentTarget;
    if (!d.moved) {
      if (Math.abs(e.clientY - d.y) < DRAG_PX) return;
      d.moved = true;
      el.setPointerCapture(e.pointerId);
      el.style.scrollSnapType = 'none';
    }
    const top = d.top - (e.clientY - d.y);
    const dt = e.timeStamp - d.t;
    if (dt > 0) d.v = (top - el.scrollTop) / dt;
    d.t = e.timeStamp;
    el.scrollTop = top;
  };

  const endDrag = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    drag.current = null;
    if (!d?.moved) return;
    const el = e.currentTarget;
    swallow.current = true;
    window.setTimeout(() => (swallow.current = false), 0);
    el.style.scrollSnapType = '';
    const carry = Math.max(-MAX_CARRY, Math.min(MAX_CARRY, d.v * MOMENTUM_MS));
    const i = Math.round((el.scrollTop + carry) / ITEM_H);
    el.scrollTo({ top: i * ITEM_H, behavior: 'smooth' });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    onChange(values[(index + step + values.length) % values.length]);
  };

  return (
    <div
      ref={ref}
      className="wheel"
      role="spinbutton"
      tabIndex={0}
      aria-label={label}
      aria-valuenow={value}
      aria-valuetext={pad2(value)}
      onScroll={onScroll}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onClickCapture={(e) => swallow.current && (e.preventDefault(), e.stopPropagation())}
      onKeyDown={onKeyDown}
    >
      {[...values, ...values, ...values].map((v, i) => (
        <button type="button" tabIndex={-1} key={i} className="wheel-item" data-on={v === value} onClick={() => onChange(v)}>
          {pad2(v)}
        </button>
      ))}
    </div>
  );
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

/** Hour and minute wheels for "HH:MM", in 5-minute steps. */
export function TimeWheel({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const [h, m] = value.split(':').map(Number);
  const min = Math.round(m / 5) * 5 === 60 ? 55 : Math.round(m / 5) * 5;
  return (
    <div className="time-wheel" role="group" aria-label={label}>
      <span className="wheel-band" aria-hidden="true" />
      <WheelColumn label={`${label} hour`} values={HOURS} value={h} onChange={(v) => onChange(`${pad2(v)}:${pad2(min)}`)} />
      <span className="wheel-colon" aria-hidden="true">
        :
      </span>
      <WheelColumn label={`${label} minutes`} values={MINUTES} value={min} onChange={(v) => onChange(`${pad2(h)}:${pad2(v)}`)} />
    </div>
  );
}
