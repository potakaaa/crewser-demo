import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useDemo } from '../store';
import { Icon } from './Icon';
import { fmtDayMonth } from '../lib/dates';
import { planSentence, todayPlan } from '../lib/stats';
import { today } from '../mock';

const CLOSE_MS = 300;

/** Bottom sheet over any tab. Mounted while open or animating out. */
export function LogSheet() {
  const open = useDemo((s) => s.logOpen);
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setClosing(false);
      return;
    }
    if (!mounted) return;
    setClosing(true);
    const t = window.setTimeout(() => {
      setMounted(false);
      setClosing(false);
      document.getElementById('log-button')?.focus();
    }, CLOSE_MS);
    return () => window.clearTimeout(t);
  }, [open, mounted]);

  if (!mounted) return null;
  return <LogSheetBody closing={closing} />;
}

function LogSheetBody({ closing }: { closing: boolean }) {
  const setOpen = useDemo((s) => s.setLogOpen);
  const breakMin = useDemo((s) => s.breakMin);
  const setBreak = useDemo((s) => s.setBreak);
  const toast = useDemo((s) => s.showToast);
  const dialogRef = useRef<HTMLDivElement>(null);
  const plan = todayPlan(breakMin);
  const close = () => setOpen(false);

  useEffect(() => {
    dialogRef.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus();
  }, []);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      close();
      return;
    }
    if (e.key !== 'Tab' || !dialogRef.current) return;
    const items = dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled])');
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <div className={`scrim${closing ? ' closing' : ''}`}>
      <button type="button" className="scrim-hit" tabIndex={-1} aria-hidden="true" onClick={close} />
      <div ref={dialogRef} className="log-dialog" role="dialog" aria-modal="true" aria-labelledby="log-title" onKeyDown={onKeyDown}>
        <span className="grabber" aria-hidden="true" />
        <div className="log-head">
          <div className="log-titles">
            <h2 id="log-title">Log today</h2>
            <span>
              {fmtDayMonth(today.date)} · Shoot day {today.shootDay}
            </span>
          </div>
          <button type="button" className="icon-btn icon-btn-soft" aria-label="Close" onClick={close} data-autofocus>
            <Icon name="close" size={18} color="#111A1B" />
          </button>
        </div>

        <div className="log-times">
          <button type="button" className="time-tile" onClick={() => toast('Time picker is not part of this demo')}>
            <span className="tt-k">Start</span>
            <span className="tt-v">{plan.call}</span>
            <span className="tt-sub">from call time</span>
          </button>
          <button type="button" className="time-tile time-tile-open" onClick={() => toast('End time is set at wrap')}>
            <span className="tt-k">End</span>
            <span className="tt-v muted">—</span>
            <span className="tt-sub">set at wrap</span>
          </button>
        </div>

        <div className="stepper" role="group" aria-label="Break">
          <span className="stepper-label">
            <span className="stepper-k">Break</span>
            <span className="stepper-sub">unpaid</span>
          </span>
          <button type="button" className="step-btn" aria-label="Less break, 5 minutes" disabled={breakMin <= 0} onClick={() => setBreak(breakMin - 5)}>
            <Icon name="minus" size={20} color="#111A1B" />
          </button>
          <output className="step-val" aria-live="polite">
            {breakMin} min
          </output>
          <button type="button" className="step-btn" aria-label="More break, 5 minutes" disabled={breakMin >= 120} onClick={() => setBreak(breakMin + 5)}>
            <Icon name="plus" size={20} color="#111A1B" />
          </button>
        </div>

        <p className="log-plan" aria-live="polite">
          {planSentence(breakMin)}
        </p>

        <button
          type="button"
          className="btn btn-lime btn-lg"
          onClick={() => {
            close();
            toast(`Start time ${plan.call} saved. Have a good shoot!`);
          }}
        >
          Save start time
        </button>
        <button type="button" className="text-btn" onClick={() => toast('The full workday view is not part of this demo')}>
          Open full workday
        </button>
      </div>
    </div>
  );
}
