import { useRef, type ReactNode } from 'react';
import { useDemo, type StatSheetKind } from '../store';
import { contract } from '../mock';
import type { ApprovalStatus } from '../mock';
import { BottomSheet } from './BottomSheet';
import { fmtH, fmtMoney, hourlyRate, nightRange, type PeriodStats } from '../lib/stats';
import { useStats } from '../lib/useStats';
import { fmtDayShort } from '../lib/dates';

const STATUS_LABEL: Record<ApprovalStatus, string> = {
  approved: 'Approved',
  submitted: 'Waiting',
  draft: 'Not submitted',
};

export function StatusChip({ status, tone = 'light' }: { status: ApprovalStatus; tone?: 'light' | 'dark' }) {
  return <span className={`status-chip status-${status} status-${tone}`}>{STATUS_LABEL[status]}</span>;
}

/** One line in a drill-down: label, a small bar, the value. */
function Row({ label, sub, value, fill, tone, extra }: { label: string; sub?: string; value: ReactNode; fill?: number; tone?: string; extra?: ReactNode }) {
  return (
    <div className="srow">
      <span className="srow-main">
        <strong>{label}</strong>
        {sub && <span>{sub}</span>}
      </span>
      {fill !== undefined && (
        <span className="srow-bar" aria-hidden="true">
          <i className={tone} style={{ width: `${Math.max(0, Math.min(1, fill)) * 100}%` }} />
        </span>
      )}
      <span className="srow-val">{value}</span>
      {extra}
    </div>
  );
}

const TITLES: Record<StatSheetKind, string> = {
  overtime: 'Overtime',
  average: 'Hours per day',
  night: 'Night hours',
  rest: 'Rest between shifts',
  approvals: 'Approvals',
  pay: 'Estimated pay',
};

function Body({ kind, s }: { kind: StatSheetKind; s: PeriodStats }) {
  const submitDay = useDemo((st) => st.submitDay);
  const toast = useDemo((st) => st.showToast);
  const maxHours = Math.max(...s.worked.map((d) => d.hours), s.dailyTarget);
  const range = (d: { start?: string; end?: string }) => `${d.start}–${d.end}`;

  switch (kind) {
    case 'overtime': {
      const max = Math.max(...s.overtimeDays.map((d) => d.overtime), 0.01);
      return (
        <>
          <div className="sheet-rows">
            {s.overtimeDays.length === 0 && <p className="sheet-empty">No overtime in this period.</p>}
            {s.overtimeDays.map((d) => (
              <Row key={d.date} label={d.short} sub={`${fmtH(d.hours)} h worked · ${range(d)}`} fill={d.overtime / max} tone="bar-lime" value={`+${fmtH(d.overtime)} h`} />
            ))}
          </div>
          <p className="sheet-note">
            Hours past {s.dailyTarget} h a day count as overtime and are paid at {contract.overtimeRate * 100}%: about {fmtMoney(s.pay.overtime, { approx: true })} in this period.
          </p>
        </>
      );
    }
    case 'average':
      return (
        <>
          <div className="sheet-rows">
            {s.worked.map((d) => (
              <Row
                key={d.date}
                label={d.short}
                sub={`${d.kind === 'prep' ? 'Prep' : 'Shoot'} · ${range(d)}`}
                fill={d.hours / maxHours}
                tone={d.overtime > 0 ? 'bar-teal' : 'bar-soft'}
                value={`${fmtH(d.hours)} h`}
              />
            ))}
          </div>
          <p className="sheet-note">
            Average {fmtH(s.average)} h over {s.workedDays} worked days. Your target is {s.dailyTarget} h a day.
          </p>
        </>
      );
    case 'night': {
      const max = Math.max(...s.nightDays.map((d) => d.night), 0.01);
      return (
        <>
          <div className="sheet-rows">
            {s.nightDays.length === 0 && <p className="sheet-empty">No night work in this period.</p>}
            {s.nightDays.map((d) => (
              <Row key={d.date} label={d.short} sub={nightRange(d)} fill={d.night / max} tone="bar-night" value={`${fmtH(d.night)} h`} />
            ))}
          </div>
          <p className="sheet-note">
            Night work counts from 22:00 to 06:00 and earns +{contract.nightSurcharge * 100}% on top: about {fmtMoney(s.pay.night, { approx: true })} in this period.
          </p>
        </>
      );
    }
    case 'rest':
      return (
        <>
          <div className="sheet-rows">
            {s.rests.map((r) => (
              <Row
                key={r.to.date}
                label={`${r.from.short} → ${r.to.short}`}
                sub={`Wrap ${r.from.end} · next call ${r.to.start}`}
                fill={Math.min(r.hours, 24) / 24}
                tone={r.short ? 'bar-rust' : 'bar-soft'}
                value={<span className={r.short ? 'text-rust' : ''}>{fmtH(r.hours)} h</span>}
              />
            ))}
          </div>
          <p className="sheet-note">
            You need at least {contract.minRestHours} h between wrap and the next call. Shorter rests are flagged to production with your timesheet.
          </p>
        </>
      );
    case 'approvals':
      return (
        <>
          <div className="sheet-rows">
            {s.worked.map((d) => (
              <Row
                key={d.date}
                label={d.short}
                sub={`${fmtH(d.hours)} h · ${range(d)}`}
                value={<StatusChip status={d.status!} />}
                extra={
                  d.status === 'draft' ? (
                    <button
                      type="button"
                      className="btn btn-ink srow-btn"
                      onClick={() => {
                        submitDay(d.date);
                        toast(`${fmtDayShort(d.date)} sent to production for approval`);
                      }}
                    >
                      Submit
                    </button>
                  ) : undefined
                }
              />
            ))}
          </div>
          <p className="sheet-note">Production approves your days before payroll. Approved days can't be edited any more.</p>
        </>
      );
    case 'pay':
      return (
        <>
          <div className="pay-lines">
            <div className="pay-line">
              <span>
                Base
                <small>
                  {fmtH(s.total - s.overtime)} h × {fmtMoney(hourlyRate, { cents: true })}
                </small>
              </span>
              <strong>{fmtMoney(s.pay.base, { cents: true })}</strong>
            </div>
            <div className="pay-line">
              <span>
                Overtime {contract.overtimeRate * 100}%
                <small>
                  {fmtH(s.overtime)} h × {fmtMoney(hourlyRate * contract.overtimeRate, { cents: true })}
                </small>
              </span>
              <strong>{fmtMoney(s.pay.overtime, { cents: true })}</strong>
            </div>
            <div className="pay-line">
              <span>
                Night surcharge +{contract.nightSurcharge * 100}%
                <small>
                  {fmtH(s.night)} h × {fmtMoney(hourlyRate * contract.nightSurcharge, { cents: true })}
                </small>
              </span>
              <strong>{fmtMoney(s.pay.night, { cents: true })}</strong>
            </div>
            <div className="pay-line">
              <span>
                Per diem
                <small>
                  {fmtMoney(contract.perDiem, { cents: true })} a day from {fmtDayShort(contract.perDiemFrom)} in Madeira
                </small>
              </span>
              <strong>{fmtMoney(s.pay.perDiem, { cents: true })}</strong>
            </div>
            <div className="pay-line pay-total">
              <span>Estimated total</span>
              <strong>{fmtMoney(s.pay.total, { approx: true, cents: true })}</strong>
            </div>
            <div className="pay-line">
              <span>Approved so far</span>
              <strong>{fmtMoney(s.approvedPay, { cents: true })}</strong>
            </div>
          </div>
          <p className="sheet-note">
            Before tax and social security, from your deal memo ({fmtMoney(contract.dailyRate)} for a {s.dailyTarget} h day). Production calculates the final payout.
          </p>
        </>
      );
  }
}

/** The drill-down sheet for whichever Statistics tile was tapped. */
export function StatSheets() {
  const kind = useDemo((st) => st.statsSheet);
  const close = useDemo((st) => st.openStatsSheet);
  const s = useStats();
  // Keep showing the last sheet's content while it animates closed.
  const last = useRef<StatSheetKind>('overtime');
  if (kind) last.current = kind;
  const k = kind ?? last.current;
  return (
    <BottomSheet open={kind !== null} onClose={() => close(null)} title={TITLES[k]} subtitle={s.eyebrow}>
      <Body kind={k} s={s} />
    </BottomSheet>
  );
}
