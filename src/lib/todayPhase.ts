import { docs, today, type Note } from '../mock';
import { toMinutes } from './dates';

export const callSheetFor = (day: string) => docs.find((d) => d.kind === 'callsheet' && d.day === day);

/** Where today's shift stands, by the app's clock: before the call, on set, or after wrap. */
export type Phase = 'before' | 'during' | 'after';

export const wrapOf = (n: Note) => n.facts.find((f) => f.label === 'Wrap' && !f.unconfirmed)?.value;

/** Wrap as minutes since midnight; a wrap at or before the call is the next day (20:00–04:00 wraps at 28:00). */
export function wrapMinutes(n: Note): number | null {
  const wrap = wrapOf(n);
  if (!wrap) return null;
  const m = toMinutes(wrap);
  return n.time && m <= toMinutes(n.time) ? m + 24 * 60 : m;
}

export function phaseOf(n: Note | undefined): Phase {
  const now = toMinutes(today.time);
  if (!n?.time || now < toMinutes(n.time)) return 'before';
  const wrap = wrapMinutes(n);
  return wrap !== null && now >= wrap ? 'after' : 'during';
}
