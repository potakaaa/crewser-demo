import { useRef } from 'react';
import { Icon } from './Icon';
import { useAddActions, type AddAction } from '../lib/addActions';
import { fmtElapsed, spokenElapsed, useTimerNow } from '../lib/timer';
import { timerElapsed, useDemo } from '../store';
import { guideEmit } from '../lib/guide';

const HOLD_MS = 500;
const MOVE_PX = 10;

/** Home's one-tap row: track time by hand (hold to start the timer), scan an invoice. */
export function QuickActions() {
  const actions = useAddActions();
  return (
    <div className="quick" role="group" aria-label="Add">
      {actions.map((a) => (a.id === 'time' ? <TimeTile key={a.id} action={a} /> : <Tile key={a.id} action={a} />))}
    </div>
  );
}

function Tile({ action }: { action: AddAction }) {
  return (
    <button type="button" className="quick-tile" onClick={action.run}>
      <TileIcon action={action} />
      <span className="quick-t">{action.label}</span>
    </button>
  );
}

function TileIcon({ action }: { action: AddAction }) {
  return (
    <span className="quick-icon">
      <Icon name={action.icon} size={20} color="currentColor" strokeWidth={1.8} />
    </span>
  );
}

/** Tap logs hours (or opens the timer while it exists); a 500ms hold starts the timer. */
function TimeTile({ action }: { action: AddAction }) {
  const timer = useDemo((s) => s.timer);
  const startTimer = useDemo((s) => s.startTimer);
  const openSheet = useDemo((s) => s.openSheet);
  const showToast = useDemo((s) => s.showToast);
  const now = useTimerNow(timer);
  const hold = useRef<{ id: number; x: number; y: number } | null>(null);
  const fired = useRef(false);

  const cancel = () => {
    if (hold.current) window.clearTimeout(hold.current.id);
    hold.current = null;
  };

  const ms = timer ? timerElapsed(timer, now) : 0;
  const running = !!timer?.runningSince;

  return (
    <button
      type="button"
      className="quick-tile"
      data-guide="track-time"
      data-paused={(timer && !running) || undefined}
      aria-label={timer ? `Timer ${running ? 'running' : 'paused'} ${spokenElapsed(ms)}, open` : 'Track time. Hold to start the timer'}
      onPointerDown={(e) => {
        fired.current = false;
        if (timer) return;
        hold.current = {
          x: e.clientX,
          y: e.clientY,
          id: window.setTimeout(() => {
            hold.current = null;
            fired.current = true;
            startTimer();
            navigator.vibrate?.(10);
            showToast('Timer started');
            guideEmit('timer:started');
          }, HOLD_MS),
        };
      }}
      onPointerMove={(e) => {
        const h = hold.current;
        if (h && Math.hypot(e.clientX - h.x, e.clientY - h.y) > MOVE_PX) cancel();
      }}
      onPointerUp={cancel}
      onPointerCancel={cancel}
      onContextMenu={(e) => e.preventDefault()}
      onClick={() => {
        if (fired.current) {
          fired.current = false;
          return;
        }
        if (timer) openSheet('timer');
        else action.run();
      }}
    >
      <TileIcon action={action} />
      {timer ? (
        <span className="quick-t quick-t-timer">
          <span className="timer-dot" aria-hidden="true" />
          <span className="timer-time num">{fmtElapsed(ms)}</span>
        </span>
      ) : (
        <span className="quick-t">{action.label}</span>
      )}
    </button>
  );
}
