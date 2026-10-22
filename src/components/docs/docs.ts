import { docs, today, type Doc, type DocKind } from '../../mock';
import { diffDays, fmtDayMonth } from '../../lib/dates';

export const KIND_TITLE: Record<DocKind, string> = {
  callsheet: 'Call sheets',
  schedule: 'Schedules',
  safety: 'Location & safety',
  other: 'Other files',
};

/** A call sheet always belongs to a day. */
export type CallSheet = Doc & { kind: 'callsheet'; day: string };

/** Call sheets by day, newest first. */
export const callSheets = docs
  .filter((d): d is CallSheet => d.kind === 'callsheet' && !!d.day)
  .sort((a, b) => b.day.localeCompare(a.day));

/** "today 07:55" · "yesterday 20:20" · "Fri 16 Oct" */
export function updatedLabel(iso: string): string {
  const day = iso.slice(0, 10);
  const n = diffDays(day, today.date);
  if (n === 0) return `today ${iso.slice(11, 16)}`;
  if (n === -1) return `yesterday ${iso.slice(11, 16)}`;
  return fmtDayMonth(day);
}

/** "Tomorrow" · "Today" · "Mon 19 Oct" */
export function dayWord(iso: string): string {
  const n = diffDays(iso, today.date);
  if (n === 0) return 'Today';
  if (n === 1) return 'Tomorrow';
  return fmtDayMonth(iso);
}
