import type { CSSProperties, ReactNode } from 'react';
import { useDemo } from '../store';
import { contract, project, today, workdays } from '../mock';
import { Icon } from '../components/Icon';
import { GradientHeader, ScreenTitle, Sheet } from '../components/Layout';
import { DayTimeline, StatsBarChart } from '../components/Charts';
import { StatusChip } from '../components/StatSheets';
import { CURRENT_WEEK, dayReadout, FIRST_WEEK, fmtDelta, fmtH, fmtMoney, insightText, weekDeltas } from '../lib/stats';
import { useStats } from '../lib/useStats';
import { useScrollRestore } from '../lib/scroll';
import { isoWeek } from '../lib/dates';

const SCALE_MAX = 14;
const RING_R = 34;
const RING_C = 2 * Math.PI * RING_R;
const REST_SCALE = 16;
/** Prep days count over the whole project, whatever period is shown. */
const PREP_TOTAL = workdays.filter((w) => w.kind === 'prep').length;

/** "↑ 7.5 h vs last week" */
function Delta({ value, tone = 'light' }: { value: number | undefined; tone?: 'light' | 'dark' | 'lime' }) {
  if (value === undefined) return null;
  const arrow = Math.abs(value) < 0.005 ? '' : value > 0 ? '↑ ' : '↓ ';
  return (
    <span className={`delta delta-${tone}`}>
      {arrow}
      {fmtDelta(value).replace(/^[+−]/, '')} vs last week
    </span>
  );
}

/** A tile that opens its day-by-day drill-down. */
function TileButton({ className, label, onClick, children }: { className: string; label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" className={`bento-tile bento-btn ${className}`} aria-label={label} onClick={onClick}>
      <span className="tile-open-icon" aria-hidden="true">
        <Icon name="arrowUpRight" size={16} strokeWidth={1.8} />
      </span>
      {children}
    </button>
  );
}

export function StatsScreen() {
  const ref = useScrollRestore<HTMLDivElement>('stats', useDemo((s) => s.setStatusDark));
  const periodKind = useDemo((s) => s.statsPeriod);
  const statsWeek = useDemo((s) => s.statsWeek);
  const statsDay = useDemo((s) => s.statsDay);
  const submitted = useDemo((s) => s.submitted);
  const setPeriod = useDemo((s) => s.setStatsPeriod);
  const shiftWeek = useDemo((s) => s.shiftStatsWeek);
  const setDay = useDemo((s) => s.setStatsDay);
  const openSheet = useDemo((s) => s.openStatsSheet);
  const submitDay = useDemo((s) => s.submitDay);
  const openLog = useDemo((s) => s.setLogOpen);
  const breakMin = useDemo((s) => s.breakMin);
  const toast = useDemo((s) => s.showToast);

  const s = useStats();
  const deltas = weekDeltas(s, submitted);
  const sel = s.days.find((d) => d.date === statsDay) ?? s.longest;
  const readout = dayReadout(sel);
  const restBefore = s.rests.find((r) => r.to.date === sel.date);
  const maxOt = Math.max(...s.overtimeDays.map((d) => d.overtime), 0.01);
  const maxNight = Math.max(...s.nightDays.map((d) => d.night), 0.01);
  const insight = insightText(s, breakMin);
  const daysLeft = project.totalShootDays - today.shootDay;
  const avgDiff = s.average - s.dailyTarget;
  const exportPdf = () => toast('PDF saved (demo)');
  const isWeek = periodKind === 'week';
  const counts = { approved: s.approvals.approved.length, submitted: s.approvals.submitted.length, draft: s.approvals.draft.length };
  const draft = s.approvals.draft[0];
  const pending = s.pay.total - s.approvedPay;

  return (
    <div className="screen" ref={ref}>
      <div className="sat-band" aria-hidden="true" />
      <GradientHeader className="gh-compact">
        <ScreenTitle eyebrow={s.eyebrow} title="Statistics">
          <button type="button" className="glass-btn glass-btn-text" onClick={exportPdf}>
            <Icon name="download" size={16} color="#FFFFFF" />
            PDF
          </button>
        </ScreenTitle>
        <div className="stats-controls">
          <div className="segmented" role="radiogroup" aria-label="Period">
            <span className="seg-pill" style={{ transform: `translateX(${isWeek ? 0 : 100}%)` }} aria-hidden="true" />
            <button type="button" role="radio" aria-checked={isWeek} onClick={() => setPeriod('week')}>
              Week
            </button>
            <button type="button" role="radio" aria-checked={!isWeek} onClick={() => setPeriod('project')}>
              Project
            </button>
          </div>
          {isWeek && (
            <div className="pager">
              <button type="button" className="icon-btn glass-btn" aria-label="Previous week" disabled={statsWeek <= FIRST_WEEK} onClick={() => shiftWeek(-1)}>
                <Icon name="left" size={18} color="#FFFFFF" />
              </button>
              <button type="button" className="icon-btn glass-btn" aria-label="Next week" disabled={statsWeek >= CURRENT_WEEK} onClick={() => shiftWeek(1)}>
                <Icon name="right" size={18} color="#FFFFFF" />
              </button>
            </div>
          )}
        </div>
      </GradientHeader>

      <Sheet className="bento">
        {!s.hasData ? (
          <div className="tile-white span-2 empty-period">
            <strong>Nothing logged in CW {s.period.kind === 'week' ? isoWeek(s.period.monday) : ''} yet</strong>
            <span>Today's call is at 11:00. Your hours show up here as soon as you log them.</span>
            <button type="button" className="btn btn-ink" onClick={() => openLog(true)}>
              <Icon name="logTime" size={16} color="#FFFFFF" />
              Log today
            </button>
          </div>
        ) : (
          <>
            <section className="tile-dark grain span-2" aria-label="Hours worked">
              <div className="kpi-row">
                <div className="kpi-dark">
                  <span className="kpi-k">Hours worked</span>
                  <span className="kpi-v kpi-v-xl">
                    {fmtH(s.total)}
                    <span className="kpi-unit"> h</span>
                  </span>
                  <Delta value={deltas?.total} tone="dark" />
                </div>
                <span className="spacer" />
                <div className="kpi-side">
                  {s.overTarget > 0 ? (
                    <span className="chip-lime chip-lime-sm">+{fmtH(s.overTarget)} h over target</span>
                  ) : (
                    <span className="chip-dark">Within target</span>
                  )}
                  <span className="kpi-k">
                    Target {fmtH(s.target)} h · {s.workedDays} × {s.dailyTarget} h
                  </span>
                </div>
              </div>
              <StatsBarChart key={s.label + s.eyebrow} stats={s} selected={sel.date} onSelect={setDay} />
              <div className="readout" aria-live="polite">
                <div className="readout-head">
                  <strong>{readout.title}</strong>
                  {sel.status && <StatusChip status={sel.status} tone="dark" />}
                </div>
                <span>{readout.detail}</span>
                <DayTimeline d={sel} target={s.dailyTarget} rest={restBefore} />
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

            <TileButton className="tile-lime" label={`Overtime ${fmtH(s.overtime)} hours. Show days`} onClick={() => openSheet('overtime')}>
              <span className="bento-kpi">
                <span className="bento-k on-lime">Overtime</span>
                <span className="bento-v">+{fmtH(s.overtime)} h</span>
                <Delta value={deltas?.overtime} tone="lime" />
              </span>
              <span className="ot-bars" aria-hidden="true">
                {s.overtimeDays.map((d, i) => (
                  <span key={d.date} style={{ height: Math.max((d.overtime / maxOt) * 44, 5), '--i': i } as CSSProperties} />
                ))}
              </span>
              <span className="bento-foot on-lime">
                {s.overtimeDays.length === s.workedDays ? `On all ${s.workedDays} worked days` : `On ${s.overtimeDays.length} of ${s.workedDays} worked days`}
              </span>
            </TileButton>

            <TileButton className="tile-white" label={`Daily average ${fmtH(s.average)} hours. Show days`} onClick={() => openSheet('average')}>
              <span className="bento-kpi">
                <span className="bento-k">Daily average</span>
                <span className="bento-v">{fmtH(s.average)} h</span>
                <Delta value={deltas?.average} />
              </span>
              <span className="bullet" aria-hidden="true">
                <span className="bullet-track">
                  <span className="bullet-fill" style={{ width: `${(Math.min(s.average, SCALE_MAX) / SCALE_MAX) * 100}%` }} />
                  <span className="bullet-tick" style={{ left: `${(s.dailyTarget / SCALE_MAX) * 100}%` }} />
                </span>
                <span className="bullet-scale">
                  <span>0</span>
                  <span>{s.dailyTarget} h target</span>
                  <span>{SCALE_MAX}</span>
                </span>
              </span>
              <span className="bento-foot">
                {fmtH(Math.abs(avgDiff))} h {avgDiff >= 0 ? 'above' : 'below'} target
              </span>
            </TileButton>

            <TileButton className="tile-white" label={`Night hours ${fmtH(s.night)}. Show days`} onClick={() => openSheet('night')}>
              <span className="bento-kpi">
                <span className="bento-k">Night hours</span>
                <span className="bento-v night-text">{fmtH(s.night)} h</span>
                <Delta value={deltas?.night} />
              </span>
              <span className="night-rows">
                {s.nightDays.length === 0 && <span className="bento-foot">No night work</span>}
                {s.nightDays.slice(0, 3).map((d) => (
                  <span className="night-row" key={d.date}>
                    <span className="night-d">{d.short}</span>
                    <span className="night-track">
                      <span style={{ width: `${(d.night / maxNight) * 100}%` }} />
                    </span>
                    <strong>{fmtH(d.night)} h</strong>
                  </span>
                ))}
              </span>
            </TileButton>

            <TileButton className={`tile-white${s.shortRests.length ? ' tile-warn' : ''}`} label={`Shortest rest ${s.shortest ? fmtH(s.shortest.hours) : '—'} hours. Show all rests`} onClick={() => openSheet('rest')}>
              <span className="bento-kpi">
                <span className="bento-k">Shortest rest</span>
                <span className={`bento-v${s.shortRests.length ? ' text-rust' : ''}`}>{s.shortest ? `${fmtH(s.shortest.hours)} h` : '—'}</span>
                {s.shortest && (
                  <span className="bento-sub">
                    {s.shortest.from.short} → {s.shortest.to.short}
                  </span>
                )}
              </span>
              {s.shortest && (
                <span className="rest-meter" aria-hidden="true">
                  <span className="rest-track">
                    <span className={`rest-fill${s.shortest.short ? ' is-short' : ''}`} style={{ width: `${(Math.min(s.shortest.hours, REST_SCALE) / REST_SCALE) * 100}%` }} />
                    <span className="bullet-tick" style={{ left: `${(contract.minRestHours / REST_SCALE) * 100}%` }} />
                  </span>
                  <span className="bullet-scale">
                    <span>0</span>
                    <span>{contract.minRestHours} h min</span>
                    <span>{REST_SCALE}</span>
                  </span>
                </span>
              )}
              <span className={`bento-foot${s.shortRests.length ? ' text-rust' : ''}`}>
                {s.shortRests.length === 0 ? `All rests ${contract.minRestHours} h or more` : `${s.shortRests.length} rest under ${contract.minRestHours} h`}
              </span>
            </TileButton>

            <section className="tile-white span-2 approvals" aria-label="Approvals">
              <div className="appr-head">
                <div className="bento-kpi">
                  <span className="bento-k">Approvals</span>
                  <span className="appr-title">
                    {counts.approved} of {s.workedDays} days approved
                  </span>
                </div>
                <button type="button" className="link-btn" onClick={() => openSheet('approvals')}>
                  All days
                </button>
              </div>
              <div className="appr-bar" role="img" aria-label={`${counts.approved} approved, ${counts.submitted} waiting, ${counts.draft} not submitted`}>
                {(['approved', 'submitted', 'draft'] as const).map((k) =>
                  counts[k] ? <span key={k} className={`appr-seg seg-${k}`} style={{ flexGrow: counts[k] }} /> : null,
                )}
              </div>
              <div className="appr-legend" aria-hidden="true">
                <span>
                  <i className="seg-approved" />
                  Approved {counts.approved}
                </span>
                <span>
                  <i className="seg-submitted" />
                  Waiting {counts.submitted}
                </span>
                <span>
                  <i className="seg-draft" />
                  Not submitted {counts.draft}
                </span>
              </div>
              {draft && (
                <div className="appr-todo">
                  <span>
                    <strong>{draft.short}</strong> · {fmtH(draft.hours)} h is not submitted yet
                  </span>
                  <button
                    type="button"
                    className="btn btn-ink appr-submit"
                    onClick={() => {
                      submitDay(draft.date);
                      toast(`${draft.short} sent to production for approval`);
                    }}
                  >
                    Submit
                  </button>
                </div>
              )}
            </section>

            <TileButton className="tile-white tile-pay span-2" label={`Estimated pay ${fmtMoney(s.pay.total, { approx: true })}. Show breakdown`} onClick={() => openSheet('pay')}>
              <span className="bento-kpi">
                <span className="bento-k">Estimated pay · before tax</span>
                <span className="bento-v">{fmtMoney(s.pay.total, { approx: true })}</span>
              </span>
              <span className="pay-bar" aria-hidden="true">
                <span className="pay-approved" style={{ flexGrow: s.approvedPay }} />
                {pending > 0 && <span className="pay-pending" style={{ flexGrow: pending }} />}
              </span>
              <span className="pay-legend">
                <span>
                  <i className="pay-approved" />
                  {fmtMoney(s.approvedPay)} approved
                </span>
                {pending > 0 && (
                  <span>
                    <i className="pay-pending" />
                    {fmtMoney(pending, { approx: true })} still open
                  </span>
                )}
              </span>
            </TileButton>

            <section className="tile-white span-2 days-tile" aria-label="Days on project">
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
              <div className="days-copy">
                <span className="bento-k">Days on project</span>
                <strong>Shoot day {today.shootDay} today</strong>
                <span>
                  {daysLeft} shoot days left · {PREP_TOTAL} prep days done
                </span>
              </div>
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
          </>
        )}
      </Sheet>
    </div>
  );
}
