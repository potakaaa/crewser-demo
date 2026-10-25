import type { ApprovalStatus } from '../../mock';
import { project, today } from '../../mock';
import { metricCopy, UnsentNudge, useHoursOverview, type HoursMetric } from '../HoursStrip';
import { fmtH, hoursOverview, type DayStat } from '../../lib/stats';

const STATUS_LABEL: Record<ApprovalStatus, string> = {
  approved: 'Approved',
  submitted: 'Submitted',
  draft: 'Draft',
};

const METRICS: HoursMetric[] = ['week', 'overtime', 'days'];
const isMetric = (id?: string): id is HoursMetric => METRICS.includes(id as HoursMetric);

/** Sheet title and subtitle, used by SheetHost. */
export function hoursSheetMeta(id?: string) {
  const metric: HoursMetric = isMetric(id) ? id : 'week';
  const title = { week: 'Last 7 days', overtime: 'Overtime', days: 'Shoot days' }[metric];
  return { title, subtitle: metric === 'days' ? `Day ${today.shootDay} of ${project.totalShootDays}` : hoursOverview().rangeLabel };
}

function Row({ day, hours }: { day: DayStat; hours: string }) {
  const status = day.status ?? 'draft';
  return (
    <li className="hsheet-row">
      <span className="hsheet-day">
        <strong>{day.short}</strong>
        <span>
          {day.start}–{day.end}
          {day.overnight && ' next day'}
        </span>
      </span>
      <span className="hsheet-h num">{hours}</span>
      <span className={`hsheet-status hsheet-${status}`}>{STATUS_LABEL[status]}</span>
    </li>
  );
}

/** One big number, one sentence, and the days behind it. `id` is week, overtime or days. */
export function HoursSheet({ id }: { id?: string }) {
  const o = useHoursOverview();
  const metric: HoursMetric = isMetric(id) ? id : 'week';
  const c = metricCopy(o, metric);
  const target = project.dailyTargetHours;

  const rows =
    metric === 'overtime'
      ? o.overtimeDays.map((d) => <Row key={d.date} day={d} hours={`+${fmtH(d.overtime)} h`} />)
      : (metric === 'days' ? o.shootDone : o.weekDays).map((d) => <Row key={d.date} day={d} hours={`${fmtH(d.hours)} h`} />);
  const listTitle = metric === 'overtime' ? `Days over ${target} h` : metric === 'days' ? 'Shoot days so far' : `Days worked, ${o.rangeLabel}`;

  return (
    <>
      <div className="hsheet-hero">
        <span className="hsheet-k">{c.label}</span>
        <span className="hsheet-v num">
          {c.value}
          {c.unit && <span className="hsheet-unit"> {c.unit}</span>}
        </span>
        <p>{c.sentence}</p>
        {metric === 'days' && <p>{`${o.shootDone.length} logged so far, ${o.shootLeft} to go after today.`}</p>}
      </div>
      <UnsentNudge o={o} solo />
      <h3 className="hsheet-h3">{listTitle}</h3>
      {rows.length > 0 ? <ul className="hsheet-list">{rows}</ul> : <p className="sheet-empty">Nothing logged yet.</p>}
    </>
  );
}
