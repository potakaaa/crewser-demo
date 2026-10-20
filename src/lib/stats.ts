import { project, week, today, notes } from '../mock';
import type { WorkDay } from '../mock';
import { fmtDayMonth, fmtDayShort, rangeLabel, toMinutes, weekday } from './dates';

/** 10.25 → "10.25", 12.0 → "12", 7.50 → "7.5" */
export const fmtH = (n: number) => String(Math.round(n * 100) / 100);

export interface DayStat extends WorkDay {
  weekday: string;
  short: string;
  regular: number;
  overtime: number;
  worked: boolean;
}

export interface WeekStats {
  days: DayStat[];
  rangeLabel: string;
  total: number;
  target: number;
  dailyTarget: number;
  workedDays: number;
  overTarget: number;
  overtime: number;
  overtimeDays: DayStat[];
  average: number;
  night: number;
  nightDays: DayStat[];
  longest: DayStat;
  longestIndex: number;
  allOverTarget: boolean;
  summary: string;
}

export function computeWeekStats(data: WorkDay[] = week, dailyTarget = project.dailyTargetHours): WeekStats {
  const days: DayStat[] = data.map((d) => ({
    ...d,
    weekday: weekday(d.date),
    short: fmtDayShort(d.date),
    regular: Math.min(d.hours, dailyTarget),
    overtime: Math.max(d.hours - dailyTarget, 0),
    worked: d.hours > 0,
  }));
  const worked = days.filter((d) => d.worked);
  const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
  const total = sum(worked.map((d) => d.hours));
  const target = worked.length * dailyTarget;
  const longestIndex = days.reduce((best, d, i) => (d.hours > days[best].hours ? i : best), 0);
  const summary =
    `Hours per day, ${rangeLabel(days[0].date, days[days.length - 1].date)}: ` +
    days.map((d) => `${d.weekday} ${d.worked ? fmtH(d.hours) + ' h' : 'off'}`).join(', ') +
    `. Target ${dailyTarget} h per day.`;
  return {
    days,
    rangeLabel: rangeLabel(days[0].date, days[days.length - 1].date),
    total,
    target,
    dailyTarget,
    workedDays: worked.length,
    overTarget: total - target,
    overtime: sum(days.map((d) => d.overtime)),
    overtimeDays: days.filter((d) => d.overtime > 0),
    average: worked.length ? total / worked.length : 0,
    night: sum(days.map((d) => d.night)),
    nightDays: days.filter((d) => d.night > 0),
    longest: days[longestIndex],
    longestIndex,
    allOverTarget: worked.length > 0 && worked.every((d) => d.overtime > 0),
    summary,
  };
}

export const weekStats = computeWeekStats();

/** One-line readout for the selected bar. */
export function dayReadout(d: DayStat) {
  const title = `${fmtDayMonth(d.date)} · ${d.worked ? fmtH(d.hours) + ' h worked' : 'day off'}`;
  if (!d.worked) return { title, detail: 'Nothing logged for this day.' };
  const parts = [`${fmtH(d.regular)} h regular`];
  if (d.overtime) parts.push(`${fmtH(d.overtime)} h overtime`);
  if (d.night) parts.push(`${fmtH(d.night)} h at night`);
  return { title, detail: parts.join(', ') + '.' };
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

export function insightText(s: WeekStats, breakMin: number) {
  const head = s.allOverTarget
    ? `Every worked day went past ${s.dailyTarget} h`
    : `${s.overtimeDays.length} of ${s.workedDays} worked days went past ${s.dailyTarget} h`;
  const l = s.longest;
  let body = `Longest was ${l.short} at ${fmtH(l.hours)} h${l.night ? `, with ${fmtH(l.night)} h at night` : ''}.`;
  const p = todayPlan(breakMin);
  if (p.wrap) {
    body +=
      p.overTarget > 0
        ? ` Today runs ${p.call} to ${p.wrap}, about ${fmtH(p.overTarget)} h more after your break.`
        : ` Today runs ${p.call} to ${p.wrap}, within your target after your break.`;
  }
  return { head, body };
}
