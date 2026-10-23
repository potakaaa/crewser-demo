import { useEffect, useMemo, useState } from 'react';
import { project, today, workdaysFor } from '../mock';
import { useActiveLink, useDemo } from '../store';
import { useSubmitted } from '../lib/useSubmitted';
import { fmtH, hoursOverview, type HoursOverview } from '../lib/stats';
import { firstNameOf } from '../lib/greeting';

export type HoursMetric = 'week' | 'overtime' | 'days';

export const useHoursOverview = () => {
  const submitted = useSubmitted();
  const start = useDemo((s) => s.logStart);
  const end = useDemo((s) => s.logEnd);
  const breakMin = useDemo((s) => s.breakMin);
  const linkId = useDemo((s) => s.activeLinkId);
  return useMemo(() => hoursOverview(submitted, { start, end, breakMin }, workdaysFor(linkId)), [submitted, start, end, breakMin, linkId]);
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
        sentence: `Today is day ${today.shootDay} of ${project.totalShootDays}.`,
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
    toast(link.isMe ? `${what} sent to production` : `${what} sent${forName}`);
  };
  return (
    <div className={`hs-nudge${solo ? ' hs-nudge-solo' : ''}`}>
      <span className="hs-nudge-dot" aria-hidden="true" />
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

/** One calm card, three numbers in a row: the last 7 days, overtime, shoot days after today (the "Days left" tile). Each opens the hours sheet. */
export function HoursStrip() {
  const openSheet = useDemo((s) => s.openSheet);
  const o = useHoursOverview();
  const tile = (metric: HoursMetric) => {
    const c = metricCopy(o, metric);
    return (
      <button type="button" className="hs-tile" data-after-master={metric === 'week' || undefined} onClick={() => openSheet('hours', metric)} aria-label={`${c.label}: ${[c.value, c.unit].filter(Boolean).join(' ')}. ${c.sentence} Open details`}>
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
      <div className="hs-card">
        <div className="hs-grid">
          {tile('week')}
          {tile('overtime')}
          {tile('days')}
        </div>
        <UnsentNudge o={o} />
      </div>
    </section>
  );
}
