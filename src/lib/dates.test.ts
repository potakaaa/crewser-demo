import { describe, expect, it } from 'vitest';
import { addDays, diffDays, fmtCountdown, monthGrid, mondayOf, relativeDay, toMinutes } from './dates';

describe('dates', () => {
  it('adds days across month ends without the time zone interfering', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-10-19', -6)).toBe('2026-10-13');
    expect(diffDays('2026-10-19', '2026-10-13')).toBe(6);
  });

  it('finds the Monday of a week', () => {
    expect(mondayOf('2026-10-19')).toBe('2026-10-19');
    expect(mondayOf('2026-10-25')).toBe('2026-10-19');
  });

  it('builds a Monday-first grid of whole weeks', () => {
    const grid = monthGrid('2026-10-15');
    expect(grid.length % 7).toBe(0);
    expect(grid[0]).toBe('2026-09-28');
    expect(grid).toContain('2026-10-31');
  });

  it('words days and countdowns', () => {
    expect(relativeDay('2026-10-20', '2026-10-19')).toBe('tomorrow');
    expect(relativeDay('2026-10-12', '2026-10-19')).toBe('7 days ago');
    expect(fmtCountdown(140)).toBe('in 2 h 20 min');
    expect(fmtCountdown(0)).toBe('now');
    expect(toMinutes('08:40')).toBe(520);
  });
});
