import { useDemo } from '../store';
import { Icon } from './Icon';
import { BottomSheet } from './BottomSheet';
import { fmtDayMonth } from '../lib/dates';
import { planSentence, todayPlan } from '../lib/stats';
import { today } from '../mock';

/** "Log today" sheet, opened from the lime Log button on any tab. */
export function LogSheet() {
  const open = useDemo((s) => s.logOpen);
  const setOpen = useDemo((s) => s.setLogOpen);
  const breakMin = useDemo((s) => s.breakMin);
  const setBreak = useDemo((s) => s.setBreak);
  const toast = useDemo((s) => s.showToast);
  const plan = todayPlan(breakMin);
  const close = () => setOpen(false);

  return (
    <BottomSheet open={open} onClose={close} title="Log today" subtitle={`${fmtDayMonth(today.date)} · Shoot day ${today.shootDay}`}>
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
    </BottomSheet>
  );
}
