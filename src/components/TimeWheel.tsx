import { useEffect, useRef, type KeyboardEvent } from 'react';
import { pad2 } from '../lib/dates';

const ITEM_H = 36;
const SETTLE_MS = 90;


interface ColumnProps {
  label: string;
  values: number[];
  value: number;
  onChange: (v: number) => void;
}

/**
 * One scroll-snapping wheel. Scrolling, tapping an item and the arrow keys all
 * pick a value; the wheel only scrolls itself when the value changes from outside.
 */
function WheelColumn({ label, values, value, onChange }: ColumnProps) {
  const ref = useRef<HTMLDivElement>(null);
  const settle = useRef(0);
  const fromScroll = useRef(false);
  const index = Math.max(0, values.indexOf(value));

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (fromScroll.current) {
      fromScroll.current = false;
      return;
    }
    el.scrollTo({ top: index * ITEM_H, behavior: el.dataset.ready ? 'smooth' : 'auto' });
    el.dataset.ready = '1';
  }, [index]);

  useEffect(() => () => window.clearTimeout(settle.current), []);

  const onScroll = () => {
    window.clearTimeout(settle.current);
    settle.current = window.setTimeout(() => {
      const el = ref.current;
      if (!el) return;
      const i = Math.min(values.length - 1, Math.max(0, Math.round(el.scrollTop / ITEM_H)));
      if (values[i] !== value) {
        fromScroll.current = true;
        onChange(values[i]);
      }
    }, SETTLE_MS);
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
      onKeyDown={onKeyDown}
    >
      {values.map((v) => (
        <button type="button" tabIndex={-1} key={v} className="wheel-item" data-on={v === value} onClick={() => onChange(v)}>
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
