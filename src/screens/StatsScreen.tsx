import type { CSSProperties } from 'react';
import { useDemo } from '../store';
import { project, today } from '../mock';
import { Icon } from '../components/Icon';
import { GradientHeader, ScreenTitle, Sheet } from '../components/Layout';
import { StatsBarChart } from '../components/Charts';
import { dayReadout, fmtH, insightText, weekStats } from '../lib/stats';
import { useScrollRestore } from '../lib/scroll';

const SCALE_MAX = 14;
const RING_R = 34;
const RING_C = 2 * Math.PI * RING_R;

export function StatsScreen() {
  const ref = useScrollRestore<HTMLDivElement>('stats', useDemo((s) => s.setStatusDark));
  const sel = useDemo((s) => s.statsBar);
  const setSel = useDemo((s) => s.setStatsBar);
  const breakMin = useDemo((s) => s.breakMin);
  const toast = useDemo((s) => s.showToast);
  const s = weekStats;
  const readout = dayReadout(s.days[sel] ?? s.longest);
  const maxOt = Math.max(...s.overtimeDays.map((d) => d.overtime), 0.01);
  const maxNight = Math.max(...s.nightDays.map((d) => d.night), 0.01);
  const insight = insightText(s, breakMin);
  const daysLeft = project.totalShootDays - today.shootDay;
  const avgDiff = s.average - s.dailyTarget;
  const exportPdf = () => toast('PDF saved (demo)');

  return (
    <div className="screen" ref={ref}>
      <div className="sat-band" aria-hidden="true" />
      <GradientHeader className="gh-compact">
        <ScreenTitle eyebrow={`Last 7 days · ${s.rangeLabel}`} title="Statistics">
          <button type="button" className="glass-btn glass-btn-text" onClick={exportPdf}>
            <Icon name="download" size={16} color="#FFFFFF" />
            PDF
          </button>
        </ScreenTitle>
      </GradientHeader>

      <Sheet className="bento">
        <section className="tile-dark grain span-2" aria-label="Hours worked">
          <div className="kpi-row">
            <div className="kpi-dark">
              <span className="kpi-k">Hours worked</span>
              <span className="kpi-v kpi-v-xl">
                {fmtH(s.total)}
                <span className="kpi-unit"> h</span>
              </span>
            </div>
            <span className="spacer" />
            <div className="kpi-side">
              <span className="chip-lime chip-lime-sm">+{fmtH(s.overTarget)} h over target</span>
              <span className="kpi-k">
                Target {fmtH(s.target)} h · {s.workedDays} × {s.dailyTarget} h
              </span>
            </div>
          </div>
          <StatsBarChart stats={s} selected={sel} onSelect={setSel} />
          <div className="readout" aria-live="polite">
            <strong>{readout.title}</strong>
            <span>{readout.detail}</span>
          </div>
          <div className="legend" aria-hidden="true">
            <span>
              <i style={{ background: '#7FA1A8' }} />
              Regular
            </span>
            <span>
              <i style={{ background: '#DBF227' }} />
              Overtime
            </span>
            <span>
              <i style={{ background: '#8A93E8' }} />
              Night
            </span>
            <span>
              <i className="legend-dash" />
              {s.dailyTarget} h target
            </span>
          </div>
        </section>

        <section className="tile-lime bento-tile" aria-label={`Overtime ${fmtH(s.overtime)} hours on ${s.overtimeDays.length} of ${s.workedDays} worked days`}>
          <div className="bento-kpi">
            <span className="bento-k on-lime">Overtime</span>
            <span className="bento-v">+{fmtH(s.overtime)} h</span>
          </div>
          <div className="ot-bars" aria-hidden="true">
            {s.overtimeDays.map((d, i) => (
              <span key={d.date} style={{ height: Math.max((d.overtime / maxOt) * 48, 5), '--i': i } as CSSProperties} />
            ))}
          </div>
          <span className="bento-foot on-lime">
            {s.overtimeDays.length === s.workedDays ? `On all ${s.workedDays} worked days` : `On ${s.overtimeDays.length} of ${s.workedDays} worked days`}
          </span>
        </section>

        <section className="tile-white bento-tile" aria-label="Daily average">
          <div className="bento-kpi">
            <span className="bento-k">Daily average</span>
            <span className="bento-v">{fmtH(s.average)} h</span>
          </div>
          <div className="bullet" role="img" aria-label={`Average ${fmtH(s.average)} hours against a ${s.dailyTarget} hour target`}>
            <div className="bullet-track">
              <span className="bullet-fill" style={{ width: `${(Math.min(s.average, SCALE_MAX) / SCALE_MAX) * 100}%` }} />
              <span className="bullet-tick" style={{ left: `${(s.dailyTarget / SCALE_MAX) * 100}%` }} />
            </div>
            <div className="bullet-scale">
              <span>0</span>
              <span>{s.dailyTarget} h target</span>
              <span>{SCALE_MAX}</span>
            </div>
          </div>
          <span className="bento-foot">
            {fmtH(Math.abs(avgDiff))} h {avgDiff >= 0 ? 'above' : 'below'} target
          </span>
        </section>

        <section className="tile-white bento-tile" aria-label={`Night hours ${fmtH(s.night)}`}>
          <div className="bento-kpi">
            <span className="bento-k">Night hours</span>
            <span className="bento-v night-text">{fmtH(s.night)} h</span>
          </div>
          <div className="night-rows">
            {s.nightDays.map((d) => (
              <div className="night-row" key={d.date}>
                <span className="night-d">{d.short}</span>
                <span className="night-track">
                  <span style={{ width: `${(d.night / maxNight) * 100}%` }} />
                </span>
                <strong>{fmtH(d.night)} h</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="tile-white bento-tile" aria-label="Days on project">
          <span className="bento-k">Days on project</span>
          <div className="ring" role="img" aria-label={`Shoot day ${today.shootDay} of ${project.totalShootDays}`}>
            <svg width="84" height="84" viewBox="0 0 84 84" aria-hidden="true">
              <circle cx="42" cy="42" r={RING_R} fill="none" stroke="#E6EDEC" strokeWidth="9" />
              <circle
                className="ring-arc"
                cx="42"
                cy="42"
                r={RING_R}
                fill="none"
                stroke="#2C6B72"
                strokeWidth="9"
                strokeLinecap="round"
                strokeDasharray={`${((today.shootDay / project.totalShootDays) * RING_C).toFixed(1)} ${RING_C.toFixed(1)}`}
                transform="rotate(-90 42 42)"
              />
            </svg>
            <span className="ring-label">
              {today.shootDay}
              <small>/{project.totalShootDays}</small>
            </span>
          </div>
          <span className="bento-foot center">{daysLeft} shoot days left</span>
        </section>

        <section className="tile-white span-2 insight">
          <span className="insight-mark" aria-hidden="true">
            <span />
          </span>
          <div className="insight-copy">
            <strong>{insight.head}</strong>
            <span>{insight.body}</span>
          </div>
        </section>

        <button type="button" className="btn btn-outline btn-lg span-2" onClick={exportPdf}>
          <Icon name="download" size={18} color="#111A1B" />
          Export statistics as PDF
        </button>
      </Sheet>
    </div>
  );
}
