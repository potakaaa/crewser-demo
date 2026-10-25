import { describe, expect, it } from 'vitest';
import { dayStat, hoursOverview, netMinutes } from './stats';
import { project, today } from '../mock';

describe('netMinutes', () => {
  it('subtracts the break from a same-day shift', () => {
    expect(netMinutes('07:00', '17:30', 30)).toEqual({ minutes: 600, overnight: false });
  });

  it('treats an end before the start as running past midnight', () => {
    expect(netMinutes('20:00', '06:00', 60)).toEqual({ minutes: 540, overnight: true });
  });

  it('never goes below zero', () => {
    expect(netMinutes('08:00', '08:00', 30).minutes).toBe(0);
  });
});

describe('dayStat', () => {
  it('derives hours and overtime against the daily target', () => {
    const d = dayStat('2026-10-16', { date: '2026-10-16', kind: 'shoot', start: '06:00', end: '18:30', breakMin: 30, status: 'draft' });
    expect(d.hours).toBe(12);
    expect(d.overtime).toBe(12 - project.dailyTargetHours);
  });

  it('is empty when nothing was logged', () => {
    expect(dayStat('2026-10-16').worked).toBe(false);
  });
});

describe('hoursOverview', () => {
  it('only counts the last 7 days, today included, and the totals agree with the rows', () => {
    const o = hoursOverview();
    const from = new Date(Date.parse(`${today.date}T00:00:00Z`) - 6 * 86_400_000).toISOString().slice(0, 10);
    expect(o.weekDays.every((d) => d.date >= from && d.date <= today.date)).toBe(true);
    const sum = Math.round(o.weekDays.reduce((a, d) => a + d.hours, 0) * 100) / 100;
    expect(o.weekTotal).toBe(sum);
  });
});
