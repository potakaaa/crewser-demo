import { notes, project, today, workdays } from '../mock';
import type { ApprovalStatus, DayKind, WorkDay } from '../mock';
import { addDays, fmtDayShort, rangeLabel, toMinutes, weekday } from './dates';

/** 10.25 → "10.25", 12.0 → "12", 7.50 → "7.5" */
export const fmtH = (n: number) => String(Math.round(n * 100) / 100);

/** 57.25 → "57.3", 7 → "7": one decimal is plenty for a big number. */
export const fmtBig = (n: number) => String(Math.round(n * 10) / 10);

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

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
  hours: number;
  overtime: number;
}

/** Turn a logged shift into hours and overtime. */
export function dayStat(date: string, wd?: WorkDay, statusOverride?: ApprovalStatus): DayStat {
  const empty: DayStat = { date, weekday: weekday(date), short: fmtDayShort(date), worked: false, breakMin: 0, hours: 0, overtime: 0 };
  if (!wd) return empty;
  const startMin = toMinutes(wd.start);
  let endMin = toMinutes(wd.end);
  if (endMin <= startMin) endMin += 24 * 60;
  const hours = (endMin - startMin - wd.breakMin) / 60;
  return {
    ...empty,
    worked: true,
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

/** The three big numbers on the dashboard and everything the hours sheet lists under them. */
export function hoursOverview(submitted: string[] = []): HoursOverview {
  const from = addDays(today.date, -6);
  const all = workdays.map((w) => dayStat(w.date, w, statusFor(w, submitted)));
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
