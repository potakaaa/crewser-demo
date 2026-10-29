import { project, today } from '../../mock';
import { useHoursOverview, type HoursMetric } from '../HoursStrip';
import { fmtH, hoursOverview, type DayStat } from '../../lib/stats';

const METRICS: HoursMetric[] = ['week', 'overtime', 'days'];
const isMetric = (id?: string): id is HoursMetric => METRICS.includes(id as HoursMetric);

/** Sheet title and subtitle, used by SheetHost. */
export function hoursSheetMeta(id?: string) {
  const metric: HoursMetric = isMetric(id) ? id : 'week';
  const title = { week: 'Last 7 days', overtime: 'Overtime', days: 'Shoot days' }[metric];
  return { title, subtitle: metric === 'days' ? `${today.shootDay} of ${project.totalShootDays} done` : hoursOverview().rangeLabel };
}

function Row({ day, hours }: { day: DayStat; hours: string }) {
  return (
    <li className="hsheet-row">
      <strong>{day.short}</strong>
      <span className="hsheet-h num">{hours}</span>
    </li>
  );
}

/** One big number and the days behind it. `id` is week, overtime or days. */
export function HoursSheet({ id }: { id?: string }) {
  const o = useHoursOverview();
  const metric: HoursMetric = isMetric(id) ? id : 'week';

  const hero = {
    week: { label: 'Total hours', value: fmtH(o.weekTotal), unit: 'h' },
    overtime: { label: 'Overtime', value: `+${fmtH(o.overtime)}`, unit: 'h' },
    days: { label: 'Left after today', value: String(o.shootLeft), unit: '' },
  }[metric];
  const rows =
    metric === 'overtime'
      ? o.overtimeDays.map((d) => <Row key={d.date} day={d} hours={`+${fmtH(d.overtime)} h`} />)
      : (metric === 'days' ? o.shootDone : o.weekDays).map((d) => <Row key={d.date} day={d} hours={`${fmtH(d.hours)} h`} />);

  return (
    <>
      <div className="hsheet-hero">
        <span className="hsheet-k">{hero.label}</span>
        <span className="hsheet-v num">
          {hero.value}
          {hero.unit && <span className="hsheet-unit"> {hero.unit}</span>}
        </span>
      </div>
      {rows.length > 0 ? <ul className="hsheet-list">{rows}</ul> : <p className="sheet-empty">Nothing logged yet.</p>}
    </>
  );
}
