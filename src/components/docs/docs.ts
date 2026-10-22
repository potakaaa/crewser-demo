import { docs, today, type Doc } from '../../mock';
import { diffDays, fmtDayMonth } from '../../lib/dates';

export type DocGroup = 'callsheet' | 'schedule' | 'safety' | 'other';

/** Where a file belongs on the Documents screen. The one-liner is a schedule, the map is a safety file. */
export function groupOf(d: Doc): DocGroup {
  if (d.kind === 'callsheet') return 'callsheet';
  if (d.kind === 'schedule' || d.id === 'oneliner') return 'schedule';
  if (d.kind === 'safety' || d.id === 'map') return 'safety';
  return 'other';
}

export const GROUP_TITLE: Record<DocGroup, string> = {
  callsheet: 'Call sheets',
  schedule: 'Schedules',
  safety: 'Location & safety',
  other: 'Other files',
};

/** Call sheets by day, newest first. */
export const callSheets = docs.filter((d) => d.kind === 'callsheet').sort((a, b) => (b.day ?? '').localeCompare(a.day ?? ''));

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
