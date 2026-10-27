import { timerElapsed, useDemo } from '../../store';
import { Icon } from '../Icon';
import { fmtElapsed, useTimerNow } from '../TimerChip';

const clock = (ms: number) => new Date(ms).toTimeString().slice(0, 5);

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
        Started {clock(timer.startedAt)}
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
