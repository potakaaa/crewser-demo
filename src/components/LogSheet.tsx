import { useEffect, useState } from 'react';
import { useDemo } from '../store';
import { Icon } from './Icon';
import { BottomSheet } from './BottomSheet';
import { Collapse } from './Layout';
import { TimeWheel } from './TimeWheel';
import { fmtDayMonth, toMinutes } from '../lib/dates';
import { fmtH, todayPlan } from '../lib/stats';
import { project, today } from '../mock';

type Field = 'start' | 'end';

/** Worked hours for start–end minus the break; an end before the start runs past midnight. */
function worked(start: string, end: string, breakMin: number) {
  let mins = toMinutes(end) - toMinutes(start);
  const overnight = mins <= 0;
  if (overnight) mins += 24 * 60;
  return { hours: (mins - breakMin) / 60, overnight };
}

function summary(start: string, end: string | null, breakMin: number) {
  const target = project.dailyTargetHours;
  const plan = todayPlan(breakMin);
  const to = end ?? plan.wrap;
  if (!to) return `Starts at ${start}. Wrap is not confirmed yet.`;
  const { hours, overnight } = worked(start, to, breakMin);
  const diff = hours - target;
  const tail = Math.abs(diff) < 0.001 ? `exactly your ${target} h target` : `${fmtH(Math.abs(diff))} h ${diff > 0 ? 'over' : 'under'} your ${target} h target`;
  const span = `${start}–${to}${overnight ? ' (next day)' : ''}`;
  return `${end ? '' : 'Planned '}${span} is ${fmtH(hours)} h after the break, ${tail}.`;
}

/** "Log today" sheet, opened from the lime Log button on any tab. */
export function LogSheet() {
  const open = useDemo((s) => s.logOpen);
  const setOpen = useDemo((s) => s.setLogOpen);
  const breakMin = useDemo((s) => s.breakMin);
  const setBreak = useDemo((s) => s.setBreak);
  const start = useDemo((s) => s.logStart);
  const end = useDemo((s) => s.logEnd);
  const setTime = useDemo((s) => s.setLogTime);
  const toast = useDemo((s) => s.showToast);
  const submitDay = useDemo((s) => s.submitDay);
  const [editing, setEditing] = useState<Field | null>(null);
  const plan = todayPlan(breakMin);
  const close = () => setOpen(false);

  // Each time the sheet opens, start with the pickers closed.
  useEffect(() => {
    if (open) setEditing(null);
  }, [open]);

  const toggle = (f: Field) => {
    if (f === 'end' && !end) setTime('logEnd', plan.wrap ?? '22:00');
    setEditing((cur) => (cur === f ? null : f));
  };

  const quick: { label: string; value: string }[] =
    editing === 'start'
      ? [
          { label: `Call ${plan.call}`, value: plan.call },
          { label: `Now ${today.time}`, value: today.time },
        ]
      : [
          ...(plan.wrap ? [{ label: `Planned wrap ${plan.wrap}`, value: plan.wrap }] : []),
          { label: `Now ${today.time}`, value: today.time },
        ];
  const current = editing === 'start' ? start : (end ?? plan.wrap ?? '22:00');
  const endInfo = end ? worked(start, end, breakMin) : null;

  const save = () => {
    close();
    // An end time means the day is over: it goes to production and the dashboard shows it as done.
    if (end) submitDay(today.date);
    if (end && endInfo) toast(`Workday saved: ${start}–${end}, ${fmtH(endInfo.hours)} h`);
    else toast(`Start time ${start} saved. Have a good shoot!`);
  };

  return (
    <BottomSheet open={open} onClose={close} title="Log today" subtitle={`${fmtDayMonth(today.date)} · Shoot day ${today.shootDay}`}>
      <div className="log-times">
        <button type="button" className="time-tile" data-active={editing === 'start'} aria-expanded={editing === 'start'} aria-controls="log-picker" onClick={() => toggle('start')}>
          <span className="tt-k">Start</span>
          <span className="tt-v">{start}</span>
          <span className="tt-sub">{start === plan.call ? 'from call time' : `call was ${plan.call}`}</span>
        </button>
        <button
          type="button"
          className={`time-tile${end ? '' : ' time-tile-open'}`}
          data-active={editing === 'end'}
          aria-expanded={editing === 'end'}
          aria-controls="log-picker"
          onClick={() => toggle('end')}
        >
          <span className="tt-k">End</span>
          <span className={`tt-v${end ? '' : ' muted'}`}>{end ?? '—'}</span>
          <span className="tt-sub">{end ? (endInfo?.overnight ? 'next day' : 'tap to change') : 'tap at wrap'}</span>
        </button>
      </div>

      <Collapse open={editing !== null} id="log-picker">
        <div className="log-picker">
          <TimeWheel
            key={editing ?? 'none'}
            label={editing === 'end' ? 'End time' : 'Start time'}
            value={current}
            onChange={(v) => setTime(editing === 'end' ? 'logEnd' : 'logStart', v)}
          />
          <div className="picker-side">
            {quick.map((q) => (
              <button type="button" key={q.label} className="picker-chip" data-on={q.value === current} onClick={() => setTime(editing === 'end' ? 'logEnd' : 'logStart', q.value)}>
                {q.label}
              </button>
            ))}
            {editing === 'end' && (
              <button
                type="button"
                className="picker-chip picker-chip-plain"
                onClick={() => {
                  setTime('logEnd', null);
                  setEditing(null);
                }}
              >
                Clear end
              </button>
            )}
            <button type="button" className="picker-done" onClick={() => setEditing(null)}>
              <Icon name="up" size={16} strokeWidth={1.8} />
              Done
            </button>
          </div>
        </div>
      </Collapse>

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
        {summary(start, end, breakMin)}
      </p>

      <button type="button" className="btn btn-lime btn-lg" onClick={save}>
        {end ? 'Save workday' : 'Save start time'}
      </button>
      <button type="button" className="text-btn" onClick={() => toast('The full workday view is not part of this demo')}>
        Open full workday
      </button>
    </BottomSheet>
  );
}
