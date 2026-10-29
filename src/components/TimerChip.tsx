import { useEffect, useState } from 'react';
import { timerElapsed, useDemo, type WorkTimer } from '../store';
import { Icon } from './Icon';
import { guideEmit } from '../lib/guide';

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

/** The work timer on Home's hours card. Idle: tap to start. Running or paused: the time opens the timer sheet, Stop logs it. */
export function TimerChip() {
  const timer = useDemo((s) => s.timer);
  const startTimer = useDemo((s) => s.startTimer);
  const stopTimer = useDemo((s) => s.stopTimer);
  const openSheet = useDemo((s) => s.openSheet);
  const now = useTimerNow(timer);

  if (!timer) {
    return (
      <button
        type="button"
        className="hs-timer"
        data-guide="timer"
        onClick={() => {
          startTimer();
          guideEmit('timer:started');
        }}
      >
        <Icon name="logTime" size={18} color="currentColor" strokeWidth={1.8} />
        Start timer
      </button>
    );
  }
  const ms = timerElapsed(timer, now);
  const running = !!timer.runningSince;
  return (
    <div className="hs-timer hs-timer-on" data-guide="timer" data-paused={!running || undefined}>
      <button type="button" className="hs-timer-main" aria-label={`Timer ${running ? 'running' : 'paused'} ${spokenElapsed(ms)}, open`} onClick={() => openSheet('timer')}>
        <span className="timer-dot" aria-hidden="true" />
        <span className="timer-time num">{fmtElapsed(ms)}</span>
      </button>
      <button type="button" className="hs-timer-stop" onClick={stopTimer}>
        Stop
      </button>
    </div>
  );
}
