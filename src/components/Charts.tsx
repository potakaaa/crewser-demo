import type { CSSProperties } from 'react';
import { fmtH, type DayStat, type PeriodStats } from '../lib/stats';
import { dayOfMonth } from '../lib/dates';

interface StackProps {
  d: DayStat;
  px: number;
  index: number;
}

/** Regular hours (teal-grey) with overtime (lime) stacked on top. */
function BarStack({ d, px, index }: StackProps) {
  return (
    <span className="bar-stack" style={{ '--i': index } as CSSProperties}>
      {d.overtime > 0 && <span className="bar-ot" style={{ height: d.overtime * px }} />}
      {d.regular > 0 && <span className={`bar-reg${d.overtime > 0 ? ' flat' : ''}`} style={{ height: d.regular * px }} />}
    </span>
  );
}

/** A small indigo dot under days with night work. */
const NightDot = ({ d }: { d: DayStat }) => <i className={`night-dot${d.night > 0 ? '' : ' is-none'}`} />;

/** Small, non-interactive version for the Home week card. */
export function MiniWeekChart({ stats }: { stats: PeriodStats }) {
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
          <span key={d.date}>
            {d.weekday}
            <NightDot d={d} />
          </span>
        ))}
      </span>
    </>
  );
}

const PX = 9;

/** Interactive stacked bar chart. A week shows values on every bar; the project view shows dates. */
export function StatsBarChart({ stats, selected, onSelect }: { stats: PeriodStats; selected: string; onSelect: (iso: string) => void }) {
  const compact = stats.days.length > 7;
  const cols = { gridTemplateColumns: `repeat(${stats.days.length}, minmax(0, 1fr))` };
  // Prep and shoot brackets under the project chart
  const spans = compact
    ? (['prep', 'shoot'] as const)
        .map((kind) => {
          const idx = stats.days.map((d, i) => (d.kind === kind ? i : -1)).filter((i) => i >= 0);
          return idx.length ? { kind, from: idx[0] + 1, to: idx[idx.length - 1] + 2 } : null;
        })
        .filter((x) => x !== null)
    : [];
  return (
    <div role="group" aria-label={stats.summary} className={`stats-chart${compact ? ' is-compact' : ''}`}>
      <div className="stats-bars" style={cols}>
        <span className="target-line" style={{ bottom: stats.dailyTarget * PX }} />
        {stats.days.map((d, i) => {
          const isSel = d.date === selected;
          const aria = `${d.short}: ${d.worked ? `${fmtH(d.hours)} h worked${d.overtime ? `, ${fmtH(d.overtime)} h overtime` : ''}${d.night ? `, ${fmtH(d.night)} h at night` : ''}` : 'day off'}`;
          return (
            <button type="button" key={d.date} className="stats-col" aria-pressed={isSel} aria-label={aria} onClick={() => onSelect(d.date)}>
              {(!compact || isSel) && (
                <span className={`bar-val${d.overtime > 0 ? ' is-ot' : d.worked ? '' : ' is-off'}`}>{d.worked ? fmtH(d.hours) : 'off'}</span>
              )}
              <BarStack d={d} px={PX} index={i} />
            </button>
          );
        })}
      </div>
      <div className="chart-days chart-days-tight" style={cols} aria-hidden="true">
        {stats.days.map((d) => (
          <span key={d.date} className={d.date === selected ? 'is-sel' : ''}>
            {compact ? dayOfMonth(d.date) : d.weekday}
            <NightDot d={d} />
          </span>
        ))}
      </div>
      {spans.length > 0 && (
        <div className="chart-spans" style={cols} aria-hidden="true">
          {spans.map((sp) => (
            <span key={sp.kind} className={`chart-span span-${sp.kind}`} style={{ gridColumn: `${sp.from} / ${sp.to}` }}>
              {sp.kind === 'prep' ? 'Prep' : 'Shoot'}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
