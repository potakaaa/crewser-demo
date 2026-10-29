import { useEffect, useMemo, useState } from 'react';
import { UnsentMark } from './UnsentMark';
import { project, today, workdaysFor } from '../mock';
import { useActiveLink, useDemo } from '../store';
import { useSubmitted } from '../lib/useSubmitted';
import { fmtH, hoursOverview, type HoursOverview } from '../lib/stats';
import { firstNameOf } from '../lib/greeting';
import { TimerChip } from './TimerChip';
import { SectionHead } from './Layout';
import { Icon } from './Icon';

export type HoursMetric = 'week' | 'overtime' | 'days';

export const useHoursOverview = () => {
  const submitted = useSubmitted();
  const start = useDemo((s) => s.logStart);
  const end = useDemo((s) => s.logEnd);
  const breakMin = useDemo((s) => s.breakMin);
  const linkId = useDemo((s) => s.activeLinkId);
  // The demo's "Empty" switch also clears the logged days, to show the statistics' first-day state.
  const empty = useDemo((s) => s.empty);
  return useMemo(() => hoursOverview(submitted, { start, end, breakMin }, empty ? [] : workdaysFor(linkId)), [submitted, start, end, breakMin, linkId, empty]);
};

/** The number, unit and one plain sentence behind each tile; the hours sheet reuses them. */
export function metricCopy(o: HoursOverview, metric: HoursMetric) {
  const n = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;
  switch (metric) {
    case 'week':
      return {
        label: 'Last 7 days',
        short: 'Last 7 days',
        value: fmtH(o.weekTotal),
        unit: 'h',
        sentence: `${n(o.weekDays.length, 'day', 'days')} worked, ${o.rangeLabel}.`,
      };
    case 'overtime':
      return {
        label: 'Overtime',
        short: 'Overtime',
        value: `+${fmtH(o.overtime)}`,
        unit: 'h',
        sentence: `Hours past your ${project.dailyTargetHours} h day, on ${n(o.overtimeDays.length, 'day', 'days')} in the last 7 days.`,
      };
    case 'days':
      return {
        label: 'Shoot days after today',
        short: 'Days left',
        value: String(o.shootLeft),
        unit: '',
        sentence: today.dayLabel ? `${today.shootDay} of ${project.totalShootDays} shoot days done. Today is a ${today.dayLabel.toLowerCase()}.` : `Today is day ${today.shootDay} of ${project.totalShootDays}.`,
      };
  }
}

/**
 * A quiet line (amber dot, "Sun 18 not sent", Send) when logged days have not been sent yet.
 * On a colleague's link it names them, and Send asks once more, like the Log sheet does.
 */
export function UnsentNudge({ o, solo }: { o: HoursOverview; solo?: boolean }) {
  const submitDay = useDemo((s) => s.submitDay);
  const toast = useDemo((s) => s.showToast);
  const offline = useDemo((s) => s.offline);
  const link = useActiveLink();
  const [confirming, setConfirming] = useState(false);
  const days = o.unsent.map((d) => d.date).join();
  // Another person or another set of days withdraws a pending confirmation.
  useEffect(() => {
    setConfirming(false);
  }, [link.id, days]);
  if (!o.unsent.length) return null;

  const first = firstNameOf(link);
  const forName = link.isMe ? '' : ` for ${first}`;
  const one = o.unsent.length === 1;
  const what = one ? o.unsent[0].short : `${o.unsent.length} days`;
  const send = () => {
    if (!link.isMe && !confirming) {
      setConfirming(true);
      return;
    }
    o.unsent.forEach((d) => submitDay(d.date));
    // Offline, days are kept on the phone and go out when it is back online (same wording as the Log sheet).
    toast(offline ? `${what} saved on this phone${forName}, sends when you're online` : link.isMe ? `${what} sent to production` : `${what} sent${forName}`);
  };
  return (
    <div className={`hs-nudge${solo ? ' hs-nudge-solo' : ''}`}>
      <UnsentMark />
      <span className="hs-nudge-text" role={confirming ? 'status' : undefined}>
        {confirming ? `Sending hours for ${link.personName}, not for you` : `${what}${forName} not sent`}
        {!confirming && <span className="sr-only"> to production yet</span>}
      </span>
      <button type="button" className="hs-send" onClick={send}>
        {confirming ? `Send for ${first}` : 'Send'}
      </button>
    </div>
  );
}

/** Daily average against the daily target: the arc fills to the target and stays full past it. */
function TargetRing({ avg }: { avg: number }) {
  const target = project.dailyTargetHours;
  const r = 26;
  const c = 2 * Math.PI * r;
  const share = Math.min(avg / target, 1);
  return (
    <span className="st-ring" aria-hidden="true">
      <svg viewBox="0 0 64 64" width="64" height="64">
        <circle cx="32" cy="32" r={r} className="st-ring-track" />
        <circle cx="32" cy="32" r={r} className="st-ring-arc" strokeDasharray={`${c * share} ${c}`} transform="rotate(-90 32 32)" />
      </svg>
      <span className="st-ring-t num">{Math.round((avg / target) * 100)}%</span>
    </span>
  );
}

/**
 * Home's statistics, after the original app's big numbers: the daily average against the target (with the
 * work timer and the not-sent line), then total hours, overtime and shoot days, each opening the hours sheet,
 * then Export to PDF. Before anything is logged it says how to start instead of showing zeros.
 */
export function HoursStrip() {
  const openSheet = useDemo((s) => s.openSheet);
  const toast = useDemo((s) => s.showToast);
  const o = useHoursOverview();
  const target = project.dailyTargetHours;
  const logged = o.weekDays.length > 0;
  const over = round1(o.dailyAvg - target);

  const row = (metric: HoursMetric, value: string, unit: string, label: string, context: string) => (
    <button type="button" className="st-row" data-metric={metric} data-after-master={metric === 'week' || undefined} onClick={() => openSheet('hours', metric)} aria-label={`${label}: ${value} ${unit}. ${context}. Open details`}>
      <span className="st-v num">
        {value}
        {unit && <span className="st-unit"> {unit}</span>}
      </span>
      <span className="st-text">
        <span className="st-k">{label}</span>
        <span className="st-c">{context}</span>
      </span>
      <Icon name="right" size={18} color="currentColor" strokeWidth={1.8} />
    </button>
  );

  return (
    <section className="stack stats" aria-label="Statistics">
      <SectionHead title="Statistics" />
      <div className="hs-card">
        {logged ? (
          <button type="button" className="st-hero" onClick={() => openSheet('hours', 'week')} aria-label={`Daily average: ${fmtH(o.dailyAvg)} hours, target ${target} h. Open details`}>
            <span className="st-hero-text">
              <span className="st-hero-v num">
                {fmtH(o.dailyAvg)}
                <span className="st-unit"> h</span>
              </span>
              <span className="st-hero-k">Daily average</span>
              <span className="st-hero-c">{over > 0 ? `${fmtH(over)} h over your ${target} h day` : over < 0 ? `${fmtH(-over)} h under your ${target} h day` : `Right on your ${target} h day`}</span>
            </span>
            <TargetRing avg={o.dailyAvg} />
          </button>
        ) : (
          <div className="st-empty">
            <strong>No hours logged yet</strong>
            <span>Start the timer when work starts, or log a shift with Track time. Your totals build up here.</span>
          </div>
        )}
        <TimerChip />
        <UnsentNudge o={o} />
      </div>
      {logged && row('week', fmtH(o.weekTotal), 'h', 'Total hours', `${o.rangeLabel}, ${o.weekDays.length} ${o.weekDays.length === 1 ? 'day' : 'days'}`)}
      {logged && row('overtime', `+${fmtH(o.overtime)}`, 'h', 'Overtime', o.overtimeDays.length ? `Past ${target} h on ${o.overtimeDays.length} ${o.overtimeDays.length === 1 ? 'day' : 'days'}` : `No day past ${target} h`)}
      {row('days', String(today.shootDay), `of ${project.totalShootDays}`, 'Shoot days', `${o.shootLeft} to go after today`)}
      {logged && (
        <button type="button" className="btn btn-outline btn-md st-export" onClick={() => toast(`Hours ${o.rangeLabel} exported as PDF`)}>
          <Icon name="download" size={18} color="currentColor" strokeWidth={1.8} />
          Export to PDF
        </button>
      )}
    </section>
  );
}

const round1 = (n: number) => Math.round(n * 10) / 10;
