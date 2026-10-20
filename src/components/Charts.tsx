import type { CSSProperties } from 'react';
import { BREAK_AFTER_MIN, fmtH, type DayStat, type PeriodStats, type Rest } from '../lib/stats';
import { dayOfMonth } from '../lib/dates';

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
          <span key={d.date}>{d.weekday}</span>
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
              <BarStack d={d} px={PX} index={i} inset={compact ? 2 : 4} />
            </button>
          );
        })}
      </div>
      <div className="chart-days chart-days-tight" style={cols} aria-hidden="true">
        {stats.days.map((d) => (
          <span key={d.date} className={d.date === selected ? 'is-sel' : ''}>
            {compact ? dayOfMonth(d.date) : d.weekday}
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

/** Timeline axis: 05:00 to 02:00 the next morning. */
const AXIS_FROM = 5 * 60;
const AXIS_TO = 26 * 60;
const pos = (m: number) => `${((Math.min(Math.max(m, AXIS_FROM), AXIS_TO) - AXIS_FROM) / (AXIS_TO - AXIS_FROM)) * 100}%`;
const width = (a: number, b: number) => `calc(${pos(b)} - ${pos(a)})`;
const TICKS = [6, 12, 18, 24].map((h) => ({ m: h * 60, label: String(h % 24).padStart(2, '0') }));

/**
 * One shift on a day axis: worked time, the break, where overtime starts and the
 * night part from 22:00. The rest before the shift sits on the left.
 */
export function DayTimeline({ d, target, rest }: { d: DayStat; target: number; rest?: Rest }) {
  if (!d.worked) return null;
  const breakFrom = d.startMin + BREAK_AFTER_MIN;
  const breakTo = breakFrom + d.breakMin;
  const otFrom = d.overtime > 0 ? d.startMin + target * 60 + d.breakMin : null;
  const nightFrom = Math.max(d.startMin, 22 * 60);
  return (
    <div className="timeline" aria-hidden="true">
      <div className="tl-track">
        {TICKS.map((t) => (
          <span key={t.m} className="tl-tick" style={{ left: pos(t.m) }} />
        ))}
        <span className="tl-shift" style={{ left: pos(d.startMin), width: width(d.startMin, d.endMin) }} />
        {otFrom !== null && <span className="tl-ot" style={{ left: pos(otFrom), width: width(otFrom, d.endMin) }} />}
        {d.night > 0 && <span className="tl-night" style={{ left: pos(nightFrom), width: width(nightFrom, d.endMin) }} />}
        {d.breakMin > 0 && <span className="tl-break" style={{ left: pos(breakFrom), width: width(breakFrom, breakTo) }} />}
      </div>
      <div className="tl-labels">
        <span className="tl-time" style={{ left: pos(d.startMin) }}>
          {d.start}
        </span>
        <span className="tl-time tl-time-end" style={{ left: pos(d.endMin) }}>
          {d.end}
        </span>
      </div>
      <div className="tl-axis">
        {TICKS.map((t) => (
          <span key={t.m} style={{ left: pos(t.m) }}>
            {t.label}
          </span>
        ))}
      </div>
      <div className="tl-notes">
        <span>
          <i className="tl-key tl-key-break" />
          {d.breakMin} min break
        </span>
        {rest && (
          <span className={rest.short ? 'tl-rest-short' : ''}>
            <i className={`tl-key ${rest.short ? 'tl-key-short' : 'tl-key-rest'}`} />
            {fmtH(rest.hours)} h rest before{rest.short ? ' · short' : ''}
          </span>
        )}
      </div>
    </div>
  );
}
