import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { timerElapsed, useDemo, type WorkTimer } from '../store';
import { Icon } from './Icon';

/** Hold this long to start the timer, like the Crewser app's "hold to start timer". */
const HOLD_MS = 500;

/** "14:05" under an hour (minutes:seconds), "2:14" (hours:minutes) after. */
export function fmtElapsed(ms: number) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}` : `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export function spokenElapsed(ms: number) {
  const min = Math.floor(ms / 60000);
  const h = Math.floor(min / 60);
  return [h && `${h} ${h === 1 ? 'hour' : 'hours'}`, `${min % 60} ${min % 60 === 1 ? 'minute' : 'minutes'}`].filter(Boolean).join(' ');
}

/** Re-renders every second while the timer runs. */
export function useTimerNow(timer: WorkTimer | null) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (!timer?.runningSince) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [timer?.runningSince]);
  return now;
}

/**
 * The work timer in every header, where the bell was. Idle: tap for manual entry (Log sheet), hold to start.
 * Running or paused: shows the time and opens the timer sheet.
 */
/** `compact`: the idle chip shows only its icon, for headers that are already full (Calendar's arrows). */
export function TimerChip({ compact = false }: { compact?: boolean }) {
  const timer = useDemo((s) => s.timer);
  const startTimer = useDemo((s) => s.startTimer);
  const setLogOpen = useDemo((s) => s.setLogOpen);
  const openSheet = useDemo((s) => s.openSheet);
  const now = useTimerNow(timer);
  const [holding, setHolding] = useState(false);
  const hold = useRef(0);
  /** When a hold last started the timer: the click that ends that same press is not a tap. */
  const firedAt = useRef(0);

  const beginHold = () => {
    if (timer) return;
    setHolding(true);
    hold.current = window.setTimeout(() => {
      firedAt.current = Date.now();
      setHolding(false);
      startTimer();
      try {
        navigator.vibrate?.(15);
      } catch {
        /* optional */
      }
    }, HOLD_MS);
  };
  const endHold = () => {
    window.clearTimeout(hold.current);
    setHolding(false);
  };
  useEffect(() => () => window.clearTimeout(hold.current), []);

  const tap = () => {
    if (Date.now() - firedAt.current < 800) return;
    if (timer) openSheet('timer');
    else setLogOpen(true);
  };
  // Keyboard on the idle chip: holding Enter or Space starts the timer too; a short press is a tap.
  const isKey = (e: KeyboardEvent) => e.key === 'Enter' || e.key === ' ';
  const onKeyDown = (e: KeyboardEvent) => {
    if (!isKey(e)) return;
    e.preventDefault();
    if (!e.repeat) beginHold();
  };
  const onKeyUp = (e: KeyboardEvent) => {
    if (!isKey(e)) return;
    e.preventDefault();
    endHold();
    tap();
  };

  if (timer) {
    const ms = timerElapsed(timer, now);
    const running = !!timer.runningSince;
    return (
      <button
        type="button"
        className="timer-chip is-on"
        data-paused={!running || undefined}
        aria-label={`Timer ${running ? 'running' : 'paused'} ${spokenElapsed(ms)}, open`}
        onClick={tap}
      >
        <span className="timer-dot" aria-hidden="true" />
        <span className="timer-time num">{fmtElapsed(ms)}</span>
      </button>
    );
  }
  return (
    <button
      type="button"
      className="timer-chip glass-btn"
      data-holding={holding || undefined}
      aria-label="Start timer, hold. Tap for manual entry"
      onPointerDown={(e) => e.button === 0 && beginHold()}
      onPointerUp={endHold}
      onPointerLeave={endHold}
      onPointerCancel={endHold}
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={onKeyDown}
      onKeyUp={onKeyUp}
      onClick={(e) => e.detail > 0 && tap()}
    >
      <span className="timer-ring" aria-hidden="true" />
      <Icon name="logTime" size={18} color="currentColor" strokeWidth={1.8} />
      {!compact && <span>Start</span>}
    </button>
  );
}
