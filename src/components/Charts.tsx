import type { CSSProperties } from 'react';
import { fmtH, type DayStat, type WeekStats } from '../lib/stats';

interface StackProps {
  d: DayStat;
  px: number;
  index: number;
  inset?: number;
}

/** Regular (teal-grey) with overtime (lime) on top; night (indigo) overlays from the bottom. */
function BarStack({ d, px, index, inset = 0 }: StackProps) {
  return (
    <span className="bar-stack" style={{ '--i': index } as CSSProperties}>
      {d.overtime > 0 && <span className="bar-ot" style={{ height: d.overtime * px }} />}
      {d.regular > 0 && <span className={`bar-reg${d.overtime > 0 ? ' flat' : ''}`} style={{ height: d.regular * px }} />}
      {d.night > 0 && <span className="bar-night" style={{ height: d.night * px, left: inset, right: inset }} />}
    </span>
  );
}

/** Small, non-interactive version for the Home week card. */
export function MiniWeekChart({ stats }: { stats: WeekStats }) {
  const px = 7;
  return (
    <>
      <span className="mini-chart" aria-hidden="true">
        <span className="target-line" style={{ bottom: stats.dailyTarget * px }} />
        {stats.days.map((d, i) => (
          <span className="mini-col" key={d.date}>
            <BarStack d={d} px={px} index={i} />
          </span>
        ))}
      </span>
      <span className="chart-days" aria-hidden="true">
        {stats.days.map((d) => (
          <span key={d.date}>{d.weekday}</span>
        ))}
      </span>
    </>
  );
}

/** Interactive stacked bar chart on the Statistics screen. */
export function StatsBarChart({ stats, selected, onSelect }: { stats: WeekStats; selected: number; onSelect: (i: number) => void }) {
  const px = 9.2;
  return (
    <div role="group" aria-label={stats.summary} className="stats-chart">
      <div className="stats-bars">
        <span className="target-line" style={{ bottom: stats.dailyTarget * px }} />
        {stats.days.map((d, i) => {
          const isSel = i === selected;
          const aria = `${d.short}: ${d.worked ? `${fmtH(d.hours)} h worked${d.overtime ? `, ${fmtH(d.overtime)} h overtime` : ''}${d.night ? `, ${fmtH(d.night)} h at night` : ''}` : 'day off'}`;
          return (
            <button type="button" key={d.date} className="stats-col" aria-pressed={isSel} aria-label={aria} onClick={() => onSelect(i)}>
              <span className={`bar-val${d.overtime > 0 ? ' is-ot' : d.worked ? '' : ' is-off'}`}>{d.worked ? fmtH(d.hours) : 'off'}</span>
              <BarStack d={d} px={px} index={i} inset={4} />
            </button>
          );
        })}
      </div>
      <div className="chart-days chart-days-tight" aria-hidden="true">
        {stats.days.map((d, i) => (
          <span key={d.date} className={i === selected ? 'is-sel' : ''}>
            {d.weekday}
          </span>
        ))}
      </div>
    </div>
  );
}
