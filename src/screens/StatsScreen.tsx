import type { ReactNode } from 'react';
import { useDemo, type StatSheetKind } from '../store';
import { contract, project, today } from '../mock';
import { Icon } from '../components/Icon';
import { GradientHeader, ScreenTitle, Sheet } from '../components/Layout';
import { StatsBarChart } from '../components/Charts';
import { StatusChip } from '../components/StatSheets';
import { CURRENT_WEEK, FIRST_WEEK, fmtH, fmtMoney, previousWeekTotal } from '../lib/stats';
import { useStats } from '../lib/useStats';
import { useScrollRestore } from '../lib/scroll';
import { fmtDayMonth, isoWeek } from '../lib/dates';

const RING_R = 30;
const RING_C = 2 * Math.PI * RING_R;

/** One number, one sentence. Tapping opens the day-by-day breakdown. */
function StatTile({ sheet, label, value, note, tone = '', aria }: { sheet: StatSheetKind; label: string; value: ReactNode; note: ReactNode; tone?: string; aria: string }) {
  const open = useDemo((s) => s.openStatsSheet);
  return (
    <button type="button" className={`stat-tile ${tone}`} aria-label={aria} onClick={() => open(sheet)}>
      <span className="stat-k">
        {label}
        <Icon name="right" size={16} strokeWidth={1.8} />
      </span>
      <span className="stat-v">{value}</span>
      <span className="stat-note">{note}</span>
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
  const toast = useDemo((s) => s.showToast);

  const s = useStats();
  const isWeek = periodKind === 'week';
  const lastWeek = previousWeekTotal(s, submitted);
  const sel = s.days.find((d) => d.date === statsDay) ?? s.longest;
  const restBefore = s.rests.find((r) => r.to.date === sel.date);
  const avgDiff = s.average - s.dailyTarget;
  const shortRest = s.shortRests[0];
  const counts = { approved: s.approvals.approved.length, submitted: s.approvals.submitted.length, draft: s.approvals.draft.length };
  const draft = s.approvals.draft[0];
  const openParts = [counts.submitted && `${counts.submitted} waiting`, counts.draft && `${counts.draft} not submitted`].filter(Boolean);
  const exportPdf = () => toast('PDF saved (demo)');

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
                </div>
                <span className="spacer" />
                {s.overTarget > 0 ? (
                  <span className="chip-lime chip-lime-sm kpi-chip">+{fmtH(s.overTarget)} h over target</span>
                ) : (
                  <span className="chip-dark kpi-chip">Within target</span>
                )}
              </div>
              {lastWeek !== null && <span className="kpi-sub">Last week {fmtH(lastWeek)} h</span>}

              <StatsBarChart key={s.label + s.eyebrow} stats={s} selected={sel.date} onSelect={setDay} />
              <div className="legend" aria-hidden="true">
                <span>
                  <i style={{ background: '#DBF227' }} />
                  Overtime
                </span>
                <span>
                  <i className="legend-night" style={{ background: '#8A93E8' }} />
                  Night work
                </span>
                <span>
                  <i className="legend-dash" />
                  {s.dailyTarget} h a day
                </span>
              </div>

              <div className="day-card" aria-live="polite">
                <div className="day-card-head">
                  <strong>{fmtDayMonth(sel.date)}</strong>
                  {sel.status && <StatusChip status={sel.status} tone="dark" />}
                </div>
                {sel.worked ? (
                  <>
                    <span className="day-card-time">
                      {sel.start} – {sel.end} · {sel.breakMin} min break
                    </span>
                    <div className="day-pills">
                      <span>
                        <b>{fmtH(sel.hours)} h</b> worked
                      </span>
                      {sel.overtime > 0 && (
                        <span className="pill-ot">
                          <b>+{fmtH(sel.overtime)} h</b> overtime
                        </span>
                      )}
                      {sel.night > 0 && (
                        <span className="pill-night">
                          <b>{fmtH(sel.night)} h</b> at night
                        </span>
                      )}
                    </div>
                    {restBefore?.short && (
                      <div className="warn-line warn-dark">
                        <Icon name="alert" size={16} color="#F4C35A" strokeWidth={1.8} />
                        <span className="warn-text">
                          <strong>{fmtH(restBefore.hours)} h rest</strong> before this day · min {contract.minRestHours} h
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  <span className="day-card-time">Day off</span>
                )}
              </div>
            </section>

            <StatTile
              sheet="overtime"
              tone="stat-lime"
              label="Overtime"
              value={`+${fmtH(s.overtime)} h`}
              note={s.overtimeDays.length === s.workedDays ? `On all ${s.workedDays} days` : `On ${s.overtimeDays.length} of ${s.workedDays} days`}
              aria={`Overtime ${fmtH(s.overtime)} hours. Show days`}
            />
            <StatTile
              sheet="average"
              label="Per day"
              value={`${fmtH(s.average)} h`}
              note={avgDiff >= 0 ? `${fmtH(avgDiff)} h more than your ${s.dailyTarget} h day` : `${fmtH(-avgDiff)} h less than your ${s.dailyTarget} h day`}
              aria={`Average ${fmtH(s.average)} hours per day. Show days`}
            />
            <StatTile
              sheet="night"
              label="At night"
              value={<span className="night-text">{fmtH(s.night)} h</span>}
              note={s.nightDays.length === 0 ? 'No night work' : s.nightDays.length <= 2 ? s.nightDays.map((d) => d.short).join(' and ') : `On ${s.nightDays.length} days`}
              aria={`Night hours ${fmtH(s.night)}. Show days`}
            />
            <StatTile
              sheet="rest"
              tone={shortRest ? 'stat-warn' : ''}
              label="Rest"
              value={shortRest ? <span className="text-rust">{fmtH(shortRest.hours)} h</span> : s.shortest ? `${fmtH(s.shortest.hours)} h` : '—'}
              note={shortRest ? `Too short · ${shortRest.to.short}` : `Always ${contract.minRestHours} h or more`}
              aria={`Shortest rest ${s.shortest ? fmtH(s.shortest.hours) : 'none'} hours. Show all rests`}
            />

            <section className="tile-white span-2 approvals" aria-label="Approvals">
              <button type="button" className="appr-head" onClick={() => openSheet('approvals')}>
                <span className="stat-k">
                  Approvals
                  <Icon name="right" size={16} strokeWidth={1.8} />
                </span>
                <span className="appr-title">
                  {counts.approved} of {s.workedDays} days approved
                </span>
              </button>
              <div className="appr-bar" role="img" aria-label={`${counts.approved} approved, ${counts.submitted} waiting, ${counts.draft} not submitted`}>
                {(['approved', 'submitted', 'draft'] as const).map((k) =>
                  counts[k] ? <span key={k} className={`appr-seg seg-${k}`} style={{ flexGrow: counts[k] }} /> : null,
                )}
              </div>
              {openParts.length > 0 && <span className="stat-note">{openParts.join(' · ')}</span>}
              {draft && (
                <div className="warn-line">
                  <Icon name="alert" size={16} color="#B5621E" strokeWidth={1.8} />
                  <span className="warn-text">
                    <strong>{draft.short}</strong> not submitted
                  </span>
                  <button
                    type="button"
                    className="warn-action"
                    onClick={() => {
                      submitDay(draft.date);
                      toast(`${draft.short} sent to production for approval`);
                    }}
                  >
                    Submit
                    <Icon name="right" size={14} strokeWidth={2} />
                  </button>
                </div>
              )}
            </section>

            <StatTile
              sheet="pay"
              label="Estimated pay"
              value={fmtMoney(s.pay.total, { approx: true })}
              note={`Before tax · ${fmtMoney(s.approvedPay)} approved so far`}
              aria={`Estimated pay ${fmtMoney(s.pay.total, { approx: true })}. Show breakdown`}
              tone="span-2 stat-wide"
            />

            <section className="tile-white span-2 days-tile" aria-label="Days on project">
              <div className="ring" role="img" aria-label={`Shoot day ${today.shootDay} of ${project.totalShootDays}`}>
                <svg width="72" height="72" viewBox="0 0 72 72" aria-hidden="true">
                  <circle cx="36" cy="36" r={RING_R} fill="none" stroke="#E6EDEC" strokeWidth="8" />
                  <circle
                    className="ring-arc"
                    cx="36"
                    cy="36"
                    r={RING_R}
                    fill="none"
                    stroke="#2C6B72"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${((today.shootDay / project.totalShootDays) * RING_C).toFixed(1)} ${RING_C.toFixed(1)}`}
                    transform="rotate(-90 36 36)"
                  />
                </svg>
                <span className="ring-label">
                  {today.shootDay}
                  <small>/{project.totalShootDays}</small>
                </span>
              </div>
              <div className="days-copy">
                <strong>Shoot day {today.shootDay} today</strong>
                <span>{project.totalShootDays - today.shootDay} shoot days left</span>
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
