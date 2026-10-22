import { notes, project, today, workdays } from '../mock';
import type { ApprovalStatus, DayKind, WorkDay } from '../mock';
import { addDays, fmtDayShort, rangeLabel, toMinutes, weekday } from './dates';

/** 10.25 → "10.25", 12.0 → "12", 7.50 → "7.5" */
export const fmtH = (n: number) => String(Math.round(n * 100) / 100);

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

export interface DayStat {
  date: string;
  weekday: string;
  /** "Fri 16" */
  short: string;
  worked: boolean;
  /** The shift ends after midnight: the end time is on the next day. */
  overnight: boolean;
  kind?: DayKind;
  status?: ApprovalStatus;
  start?: string;
  end?: string;
  breakMin: number;
  hours: number;
  overtime: number;
}

/** Turn a logged shift into hours and overtime. */
export function dayStat(date: string, wd?: WorkDay, statusOverride?: ApprovalStatus): DayStat {
  const empty: DayStat = { date, weekday: weekday(date), short: fmtDayShort(date), worked: false, overnight: false, breakMin: 0, hours: 0, overtime: 0 };
  if (!wd) return empty;
  const startMin = toMinutes(wd.start);
  let endMin = toMinutes(wd.end);
  const overnight = endMin <= startMin;
  if (overnight) endMin += 24 * 60;
  const hours = (endMin - startMin - wd.breakMin) / 60;
  return {
    ...empty,
    worked: true,
    overnight,
    kind: wd.kind,
    status: statusOverride ?? wd.status,
    start: wd.start,
    end: wd.end,
    breakMin: wd.breakMin,
    hours,
    overtime: Math.max(hours - project.dailyTargetHours, 0),
  };
}

/** Days the crew member sent from this prototype move from draft to submitted. */
const statusFor = (w: WorkDay, submitted: string[]): ApprovalStatus => (w.status === 'draft' && submitted.includes(w.date) ? 'submitted' : w.status);

/** The shift the crew member logged today, as the Log sheet holds it. */
export interface TodayShift {
  start: string;
  end: string | null;
  breakMin: number;
}

/** "11:00–22:00 · 11 h", with "next day" after an end past midnight. */
export const shiftLabel = (d: DayStat) => `${d.start}–${d.end}${d.overnight ? ' next day' : ''} · ${fmtH(d.hours)} h`;

export interface HoursOverview {
  /** "13–19 Oct" */
  rangeLabel: string;
  /** Logged days in the last 7 days, today included, oldest first. */
  weekDays: DayStat[];
  weekTotal: number;
  overtime: number;
  /** Days of the last 7 that ran past the daily target. */
  overtimeDays: DayStat[];
  /** Shoot days logged so far, oldest first (prep days do not count). */
  shootDone: DayStat[];
  shootLeft: number;
  /** Logged days not sent to production yet. */
  unsent: DayStat[];
}

/**
 * The three big numbers on the dashboard and everything the hours sheet lists under them.
 * Today's shift counts once it has been sent (it lives in the Log sheet, not in the mock days).
 */
export function hoursOverview(submitted: string[] = [], shift?: TodayShift | null): HoursOverview {
  const from = addDays(today.date, -6);
  const days: WorkDay[] = [...workdays];
  if (shift?.end && submitted.includes(today.date) && !days.some((w) => w.date === today.date)) {
    days.push({ date: today.date, kind: 'shoot', start: shift.start, end: shift.end, breakMin: shift.breakMin, status: 'draft' });
  }
  const all = days.map((w) => dayStat(w.date, w, statusFor(w, submitted)));
  const weekDays = all.filter((d) => d.date >= from && d.date <= today.date);
  const shootDone = all.filter((d) => d.kind === 'shoot');
  return {
    rangeLabel: rangeLabel(from, today.date),
    weekDays,
    weekTotal: sum(weekDays.map((d) => d.hours)),
    overtime: sum(weekDays.map((d) => d.overtime)),
    overtimeDays: weekDays.filter((d) => d.overtime > 0),
    shootDone,
    shootLeft: Math.max(project.totalShootDays - today.shootDay, 0),
    unsent: all.filter((d) => d.status === 'draft'),
  };
}

/** Today's planned shift, taken from the shoot-day note's call and wrap facts. */
export function todayPlan(breakMin: number) {
  const shoot = notes.find((n) => n.day === today.date && n.type === 'appointment' && n.kind === 'time');
  const call = shoot?.facts.find((f) => f.label === 'Call')?.value ?? shoot?.time ?? '—';
  const wrap = shoot?.facts.find((f) => f.label === 'Wrap' && !f.unconfirmed)?.value;
  const net = wrap ? (toMinutes(wrap) - toMinutes(call) - breakMin) / 60 : 0;
  return { call, wrap, net, overTarget: net - project.dailyTargetHours };
}
