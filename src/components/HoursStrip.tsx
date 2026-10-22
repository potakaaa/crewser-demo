import { useMemo } from 'react';
import { project, today } from '../mock';
import { useDemo } from '../store';
import { Icon } from './Icon';
import { useSubmitted } from '../lib/useSubmitted';
import { fmtH, hoursOverview, type HoursOverview } from '../lib/stats';

export type HoursMetric = 'week' | 'overtime' | 'days';

export const useHoursOverview = () => {
  const submitted = useSubmitted();
  const start = useDemo((s) => s.logStart);
  const end = useDemo((s) => s.logEnd);
  const breakMin = useDemo((s) => s.breakMin);
  return useMemo(() => hoursOverview(submitted, { start, end, breakMin }), [submitted, start, end, breakMin]);
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
        short: 'Days to go',
        value: String(o.shootLeft),
        unit: '',
        sentence: `Today is day ${today.shootDay} of ${project.totalShootDays}.`,
      };
  }
}

/** Sends every logged-but-unsent day to production. */
export function useSubmitUnsent(o: HoursOverview) {
  const submitDay = useDemo((s) => s.submitDay);
  const toast = useDemo((s) => s.showToast);
  return () => {
    o.unsent.forEach((d) => submitDay(d.date));
    toast(o.unsent.length === 1 ? `${o.unsent[0].short} sent to production` : `${o.unsent.length} days sent to production`);
  };
}

/** Amber nudge when logged days have not been sent yet. */
export function UnsentNudge({ o }: { o: HoursOverview }) {
  const submit = useSubmitUnsent(o);
  if (!o.unsent.length) return null;
  const one = o.unsent.length === 1;
  return (
    <div className="hs-nudge">
      <span className="hs-nudge-icon">
        <Icon name="alert" size={16} color="#6B4A00" />
      </span>
      <span className="hs-nudge-text">
        <strong>{one ? `${o.unsent[0].short} is not sent yet` : `${o.unsent.length} days are not sent yet`}</strong>
      </span>
      <button type="button" className="btn btn-ink hs-nudge-btn" onClick={submit}>
        Send
      </button>
    </div>
  );
}

/** Three big numbers in one row: the last 7 days, overtime, shoot days left. Each opens the hours sheet. */
export function HoursStrip() {
  const openSheet = useDemo((s) => s.openSheet);
  const o = useHoursOverview();
  const tile = (metric: HoursMetric, className: string) => {
    const c = metricCopy(o, metric);
    return (
      <button type="button" className={`hs-tile ${className}`} data-after-master={metric === 'week' || undefined} onClick={() => openSheet('hours', metric)} aria-label={`${c.label}: ${[c.value, c.unit].filter(Boolean).join(' ')}. ${c.sentence} Open details`}>
        <span className="hs-k">{c.short}</span>
        <span className="hs-v num">
          {c.value}
          {c.unit && <span className="hs-unit"> {c.unit}</span>}
        </span>
      </button>
    );
  };
  return (
    <section className="hs" aria-label="Your hours">
      <div className="hs-grid">
        {tile('week', 'hs-week')}
        {tile('overtime', 'hs-ot')}
        {tile('days', 'hs-days')}
      </div>
      <UnsentNudge o={o} />
    </section>
  );
}
