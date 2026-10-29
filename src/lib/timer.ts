import { useEffect, useState } from 'react';
import type { WorkTimer } from '../store';

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
