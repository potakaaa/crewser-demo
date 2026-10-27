import { useEffect, useState } from 'react';
import { useActiveLink, useDemo } from '../store';
import { Icon } from './Icon';
import { BottomSheet } from './BottomSheet';
import { Collapse } from './Layout';
import { TimeWheel } from './TimeWheel';
import { fmtDayMonth } from '../lib/dates';
import { fmtH, netMinutes, todayPlan } from '../lib/stats';
import { project, today } from '../mock';

type Field = 'start' | 'end';

/** Worked hours for start–end minus the break (see `netMinutes`); `valid` is false when nothing is left to send. */
function worked(start: string, end: string, breakMin: number) {
  const { minutes, overnight } = netMinutes(start, end, breakMin);
  return { hours: minutes / 60, overnight, valid: minutes > 0 };
}

const BAD_SPAN = 'End must be after the start plus the break.';

function summary(start: string, end: string | null, breakMin: number) {
  const target = project.dailyTargetHours;
  const plan = todayPlan();
  const to = end ?? plan.wrap;
  if (!to) return `Starts at ${start}. Wrap is not confirmed yet.`;
  const { hours, overnight, valid } = worked(start, to, breakMin);
  if (!valid) return `${end ? '' : 'Planned '}${start}–${to} leaves no hours after the break.`;
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
  const offline = useDemo((s) => s.offline);
  const link = useActiveLink();
  const [editing, setEditing] = useState<Field | null>(null);
  /** Entering hours for someone else: the first tap on Submit asks, the second sends. */
  const [confirming, setConfirming] = useState(false);
  const plan = todayPlan();
  const close = () => setOpen(false);

  // Each time the sheet opens, start with the pickers closed.
  useEffect(() => {
    if (open) setEditing(null);
  }, [open]);

  // Any change to the hours, or another person, withdraws a pending confirmation.
  useEffect(() => {
    setConfirming(false);
  }, [open, start, end, breakMin, link.id]);

  // Opening the End tile only previews the planned wrap on the wheel. The end counts as set
  // once the user turns the wheel or taps a chip, so a plan is never sent by accident.
  const toggle = (f: Field) => setEditing((cur) => (cur === f ? null : f));

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

  const forName = link.isMe ? '' : ` for ${link.personName}`;
  const sendLine =
    end && endInfo ? `${fmtDayMonth(today.date)} · ${start}–${end}${endInfo.overnight ? ' (next day)' : ''} · ${fmtH(endInfo.hours)} h` : null;

  const badSpan = !!endInfo && !endInfo.valid;

  const save = () => {
    if (badSpan) return;
    if (!end) {
      close();
      toast(link.isMe ? `Start time ${start} saved. Have a good shoot!` : `Start time${forName} saved`);
      return;
    }
    if (!link.isMe && !confirming) {
      setConfirming(true);
      return;
    }
    close();
    // An end time the user set means the day is over: it goes to production and the dashboard shows it as done.
    submitDay(today.date);
    toast(offline ? `Saved on this phone${forName}, sends when you're online` : `Hours${forName} sent to production`);
  };

  return (
    <BottomSheet
      open={open}
      onClose={close}
      title={link.isMe ? 'Log today' : `Hours for ${link.personName}`}
      subtitle={`${fmtDayMonth(today.date)} · Shoot day ${today.shootDay}${link.isMe ? '' : ` · ${link.position}`}`}
    >
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
          <Icon name="minus" size={20} color="currentColor" />
        </button>
        <output className="step-val" aria-live="polite">
          {breakMin} min
        </output>
        <button type="button" className="step-btn" aria-label="More break, 5 minutes" disabled={breakMin >= 120} onClick={() => setBreak(breakMin + 5)}>
          <Icon name="plus" size={20} color="currentColor" />
        </button>
      </div>

      <p className="log-plan" aria-live={badSpan ? 'off' : 'polite'}>
        {summary(start, end, breakMin)}
      </p>

      {sendLine && !badSpan && <p className="log-send">{sendLine}</p>}
      {badSpan && (
        <p className="log-confirm" id="log-bad-span" role="alert">
          {BAD_SPAN}
        </p>
      )}
      {confirming && (
        <p className="log-confirm" role="status">
          You are sending hours for {link.personName}, not for yourself.
        </p>
      )}
      <button type="button" className="btn btn-lime btn-lg" aria-disabled={badSpan} aria-describedby={badSpan ? 'log-bad-span' : undefined} onClick={save}>
        {!end ? 'Save start time' : confirming ? `Submit for ${link.personName}` : 'Submit hours'}
      </button>
      <button type="button" className="text-btn" onClick={() => toast('The full workday view is not part of this demo')}>
        Open full workday
      </button>
    </BottomSheet>
  );
}
