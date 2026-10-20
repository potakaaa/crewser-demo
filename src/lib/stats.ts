import { contract, notes, project, today, workdays } from '../mock';
import type { ApprovalStatus, DayKind, WorkDay } from '../mock';
import { addDays, fmtDayMonth, fmtDayShort, isoWeek, mondayOf, rangeLabel, toMinutes, weekday } from './dates';

/** 10.25 → "10.25", 12.0 → "12", 7.50 → "7.5" */
export const fmtH = (n: number) => String(Math.round(n * 100) / 100);

/** €3,066 · ~€3,066 · €472.50 (cents only when there are any) */
export function fmtMoney(n: number, opts: { approx?: boolean; cents?: boolean } = {}) {
  const rounded = Math.round(n * 100) / 100;
  const withCents = opts.cents && !Number.isInteger(rounded);
  const s = rounded.toLocaleString('en-US', { minimumFractionDigits: withCents ? 2 : 0, maximumFractionDigits: withCents ? 2 : 0 });
  return `${opts.approx ? '~' : ''}€${s}`;
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const overlap = (a0: number, a1: number, b0: number, b1: number) => Math.max(0, Math.min(a1, b1) - Math.max(a0, b0));

/** Night work counts from 22:00 to 06:00. */
const NIGHT_FROM = 22 * 60;
const NIGHT_TO = 6 * 60;
/** The break is placed after six hours of work (the latest the law allows). */
export const BREAK_AFTER_MIN = 6 * 60;

export const hourlyRate = contract.dailyRate / project.dailyTargetHours;

export interface DayPay {
  base: number;
  overtime: number;
  night: number;
  perDiem: number;
  total: number;
}

export interface DayStat {
  date: string;
  weekday: string;
  /** "Fri 16" */
  short: string;
  worked: boolean;
  kind?: DayKind;
  status?: ApprovalStatus;
  start?: string;
  end?: string;
  breakMin: number;
  /** Minutes from that day's 00:00; end can pass 1440 (after midnight). */
  startMin: number;
  endMin: number;
  hours: number;
  regular: number;
  overtime: number;
  night: number;
  pay: DayPay;
}

export interface Rest {
  from: DayStat;
  to: DayStat;
  hours: number;
  short: boolean;
}

export type Period = { kind: 'week'; monday: string } | { kind: 'project' };

export interface PeriodStats {
  period: Period;
  label: string;
  /** "CW 42 · 12–18 Oct" or "Prep + shoot · 7–18 Oct" */
  eyebrow: string;
  /** "12–18 Oct" */
  rangeLabel: string;
  days: DayStat[];
  worked: DayStat[];
  hasData: boolean;
  dailyTarget: number;
  total: number;
  target: number;
  workedDays: number;
  overTarget: number;
  overtime: number;
  overtimeDays: DayStat[];
  average: number;
  night: number;
  nightDays: DayStat[];
  longest: DayStat;
  allOverTarget: boolean;
  rests: Rest[];
  shortest: Rest | undefined;
  shortRests: Rest[];
  approvals: Record<ApprovalStatus, DayStat[]>;
  pay: DayPay;
  approvedPay: number;
  prepDays: number;
  shootDays: number;
  summary: string;
}

/** Turn a logged shift into hours, overtime, night hours and pay. */
export function dayStat(date: string, wd?: WorkDay, statusOverride?: ApprovalStatus): DayStat {
  const short = fmtDayShort(date);
  const empty: DayStat = {
    date,
    weekday: weekday(date),
    short,
    worked: false,
    breakMin: 0,
    startMin: 0,
    endMin: 0,
    hours: 0,
    regular: 0,
    overtime: 0,
    night: 0,
    pay: { base: 0, overtime: 0, night: 0, perDiem: 0, total: 0 },
  };
  if (!wd) return empty;
  const startMin = toMinutes(wd.start);
  let endMin = toMinutes(wd.end);
  if (endMin <= startMin) endMin += 24 * 60;
  const hours = (endMin - startMin - wd.breakMin) / 60;
  const target = project.dailyTargetHours;
  const regular = Math.min(hours, target);
  const overtime = Math.max(hours - target, 0);
  const night = (overlap(startMin, endMin, NIGHT_FROM, 24 * 60 + NIGHT_TO) + overlap(startMin, endMin, 0, NIGHT_TO)) / 60;
  const pay = {
    base: regular * hourlyRate,
    overtime: overtime * hourlyRate * contract.overtimeRate,
    night: night * hourlyRate * contract.nightSurcharge,
    perDiem: date >= contract.perDiemFrom ? contract.perDiem : 0,
    total: 0,
  };
  pay.total = pay.base + pay.overtime + pay.night + pay.perDiem;
  return {
    ...empty,
    worked: true,
    kind: wd.kind,
    status: statusOverride ?? wd.status,
    start: wd.start,
    end: wd.end,
    breakMin: wd.breakMin,
    startMin,
    endMin,
    hours,
    regular,
    overtime,
    night,
    pay,
  };
}

const firstLogged = workdays[0].date;
const lastLogged = workdays[workdays.length - 1].date;
/** Mondays the week view can page between: first logged week up to this week. */
export const FIRST_WEEK = mondayOf(firstLogged);
export const CURRENT_WEEK = mondayOf(today.date);
/** "Last 7 days" on Home: the week before today's. */
export const LAST_WEEK = addDays(CURRENT_WEEK, -7);

function daysOf(period: Period): string[] {
  if (period.kind === 'week') return Array.from({ length: 7 }, (_, i) => addDays(period.monday, i));
  const out: string[] = [];
  for (let d = firstLogged; d <= lastLogged; d = addDays(d, 1)) out.push(d);
  return out;
}

/** All rest periods between consecutive logged shifts, wherever they fall. */
function allRests(submitted: string[]): Rest[] {
  const shifts = workdays.map((w) => dayStat(w.date, w, statusFor(w, submitted)));
  return shifts.slice(1).map((to, i) => {
    const from = shifts[i];
    const gapMin = (toEpochMin(to.date) + to.startMin) - (toEpochMin(from.date) + from.endMin);
    const hours = gapMin / 60;
    return { from, to, hours, short: hours < contract.minRestHours };
  });
}

const toEpochMin = (iso: string) => Date.parse(iso + 'T00:00:00Z') / 60000;

const statusFor = (w: WorkDay, submitted: string[]): ApprovalStatus =>
  w.status === 'draft' && submitted.includes(w.date) ? 'submitted' : w.status;

/**
 * Every number on the Statistics screen for one period. `submitted` holds days the
 * crew member sent from this prototype, so their status moves from draft to submitted.
 */
export function computeStats(period: Period, submitted: string[] = []): PeriodStats {
  const byDate = new Map(workdays.map((w) => [w.date, w]));
  const days = daysOf(period).map((date) => {
    const w = byDate.get(date);
    return dayStat(date, w, w ? statusFor(w, submitted) : undefined);
  });
  const worked = days.filter((d) => d.worked);
  const dailyTarget = project.dailyTargetHours;
  const total = sum(worked.map((d) => d.hours));
  const target = worked.length * dailyTarget;
  const longest = days.reduce((best, d) => (d.hours > best.hours ? d : best), days[0]);
  const range = rangeLabel(days[0].date, days[days.length - 1].date);
  const inRange = new Set(days.map((d) => d.date));
  const rests = allRests(submitted).filter((r) => inRange.has(r.to.date));
  const shortest = rests.reduce<Rest | undefined>((best, r) => (!best || r.hours < best.hours ? r : best), undefined);
  const approvals: Record<ApprovalStatus, DayStat[]> = {
    approved: worked.filter((d) => d.status === 'approved'),
    submitted: worked.filter((d) => d.status === 'submitted'),
    draft: worked.filter((d) => d.status === 'draft'),
  };
  const pay: DayPay = {
    base: sum(worked.map((d) => d.pay.base)),
    overtime: sum(worked.map((d) => d.pay.overtime)),
    night: sum(worked.map((d) => d.pay.night)),
    perDiem: sum(worked.map((d) => d.pay.perDiem)),
    total: sum(worked.map((d) => d.pay.total)),
  };
  const label = period.kind === 'week' ? `CW ${isoWeek(period.monday)}` : 'Whole project';
  return {
    period,
    label,
    eyebrow: period.kind === 'week' ? `CW ${isoWeek(period.monday)} · ${range}` : `Prep + shoot · ${range}`,
    rangeLabel: range,
    days,
    worked,
    hasData: worked.length > 0,
    dailyTarget,
    total,
    target,
    workedDays: worked.length,
    overTarget: total - target,
    overtime: sum(days.map((d) => d.overtime)),
    overtimeDays: days.filter((d) => d.overtime > 0),
    average: worked.length ? total / worked.length : 0,
    night: sum(days.map((d) => d.night)),
    nightDays: days.filter((d) => d.night > 0),
    longest,
    allOverTarget: worked.length > 0 && worked.every((d) => d.overtime > 0),
    rests,
    shortest,
    shortRests: rests.filter((r) => r.short),
    approvals,
    pay,
    approvedPay: sum(approvals.approved.map((d) => d.pay.total)),
    prepDays: worked.filter((d) => d.kind === 'prep').length,
    shootDays: worked.filter((d) => d.kind === 'shoot').length,
    summary:
      `Hours per day, ${range}: ` +
      days.map((d) => `${d.short} ${d.worked ? fmtH(d.hours) + ' h' : 'off'}`).join(', ') +
      `. Target ${dailyTarget} h per day.`,
  };
}

/** Home's week card and the default Statistics view. */
export const weekStats = computeStats({ kind: 'week', monday: LAST_WEEK });

export interface Deltas {
  total: number;
  overtime: number;
  average: number;
  night: number;
}

/** Change against the week before; null when there is nothing to compare with. */
export function weekDeltas(s: PeriodStats, submitted: string[] = []): Deltas | null {
  if (s.period.kind !== 'week') return null;
  const prev = computeStats({ kind: 'week', monday: addDays(s.period.monday, -7) }, submitted);
  if (!prev.hasData || !s.hasData) return null;
  return { total: s.total - prev.total, overtime: s.overtime - prev.overtime, average: s.average - prev.average, night: s.night - prev.night };
}

/** "+7.5 h" · "−1.25 h" · "same" */
export const fmtDelta = (n: number) => (Math.abs(n) < 0.005 ? 'same' : `${n > 0 ? '+' : '−'}${fmtH(Math.abs(n))} h`);

/** One-line readout for the selected bar. */
export function dayReadout(d: DayStat) {
  const title = `${fmtDayMonth(d.date)} · ${d.worked ? fmtH(d.hours) + ' h worked' : 'day off'}`;
  if (!d.worked) return { title, detail: 'Nothing logged for this day.' };
  const parts = [`${fmtH(d.regular)} h regular`];
  if (d.overtime) parts.push(`${fmtH(d.overtime)} h overtime`);
  if (d.night) parts.push(`${fmtH(d.night)} h at night`);
  return { title, detail: parts.join(', ') + '.' };
}

/** "22:00–00:30" for the night part of a shift. */
export function nightRange(d: DayStat) {
  const from = Math.max(d.startMin, NIGHT_FROM);
  const clock = (m: number) => `${String(Math.floor((m % 1440) / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  return `${clock(from)}–${clock(d.endMin)}`;
}

/** Today's planned shift, taken from the shoot-day note's call and wrap facts. */
export function todayPlan(breakMin: number) {
  const shoot = notes.find((n) => n.day === today.date && n.type === 'appointment' && n.kind === 'time');
  const call = shoot?.facts.find((f) => f.label === 'Call')?.value ?? shoot?.time ?? '—';
  const wrap = shoot?.facts.find((f) => f.label === 'Wrap' && !f.unconfirmed)?.value;
  const net = wrap ? (toMinutes(wrap) - toMinutes(call) - breakMin) / 60 : 0;
  return { call, wrap, net, overTarget: net - project.dailyTargetHours };
}

export function planSentence(breakMin: number) {
  const p = todayPlan(breakMin);
  if (!p.wrap) return `Starts at ${p.call}. Wrap is not confirmed yet.`;
  const diff = p.overTarget;
  const tail =
    Math.abs(diff) < 0.001
      ? `exactly your ${project.dailyTargetHours} h target`
      : `${fmtH(Math.abs(diff))} h ${diff > 0 ? 'over' : 'under'} your ${project.dailyTargetHours} h target`;
  return `Planned ${p.call}–${p.wrap} is ${fmtH(p.net)} h after the break, ${tail}.`;
}

export function insightText(s: PeriodStats, breakMin: number) {
  const head = s.allOverTarget
    ? `Every worked day went past ${s.dailyTarget} h`
    : `${s.overtimeDays.length} of ${s.workedDays} worked days went past ${s.dailyTarget} h`;
  const l = s.longest;
  let body = `Longest was ${l.short} at ${fmtH(l.hours)} h${l.night ? `, with ${fmtH(l.night)} h at night` : ''}.`;
  const sr = s.shortRests[0];
  if (sr) body += ` Rest was short once: ${fmtH(sr.hours)} h between ${sr.from.short} and ${sr.to.short}.`;
  const p = todayPlan(breakMin);
  if (p.wrap && (s.period.kind === 'project' || s.period.monday === LAST_WEEK)) {
    body +=
      p.overTarget > 0
        ? ` Today runs ${p.call} to ${p.wrap}, about ${fmtH(p.overTarget)} h more after your break.`
        : ` Today runs ${p.call} to ${p.wrap}, within your target after your break.`;
  }
  return { head, body };
}
