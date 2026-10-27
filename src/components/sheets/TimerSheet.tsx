import { timerElapsed, timerStartMin, useDemo } from '../../store';
import { Icon } from '../Icon';
import { fmtElapsed, useTimerNow } from '../TimerChip';

/** "08:12" from minutes since midnight. */
const clock = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

export const timerSheetMeta = () => ({ title: 'Work timer' });

/** The running timer: how long, since when, pause or stop. Stopping fills the Log sheet. */
export function TimerSheet() {
  const timer = useDemo((s) => s.timer);
  const toggle = useDemo((s) => s.toggleTimerPause);
  const stop = useDemo((s) => s.stopTimer);
  const close = useDemo((s) => s.closeSheet);
  const now = useTimerNow(timer);
  if (!timer) {
    return (
      <p className="note-text">
        No timer running.{' '}
        <button type="button" className="link-btn" onClick={close}>
          Close
        </button>
      </p>
    );
  }
  const running = !!timer.runningSince;
  return (
    <div className="tsheet">
      <div className="tsheet-time num" role="timer" aria-live="off">
        {fmtElapsed(timerElapsed(timer, now))}
      </div>
      <p className="tsheet-sub">
        Started {clock(Math.max(0, timerStartMin(timerElapsed(timer, now))))}
        {running ? '' : ' · paused'}
      </p>
      <div className="tsheet-actions">
        <button type="button" className="btn btn-soft btn-md" onClick={toggle}>
          <Icon name={running ? 'minus' : 'logTime'} size={18} color="currentColor" strokeWidth={1.8} />
          {running ? 'Pause' : 'Resume'}
        </button>
        <button type="button" className="btn btn-lime btn-md" onClick={stop}>
          <Icon name="check" size={18} color="currentColor" strokeWidth={2.2} />
          Stop and log
        </button>
      </div>
    </div>
  );
}
