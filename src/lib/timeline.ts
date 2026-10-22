import { notes as allNotes, today } from '../mock';
import type { Note } from '../mock';
import { addDays, diffDays, fmtCountdown, fmtDayMonth, fmtDayShort, relativeDay, toMinutes } from './dates';
import { sortNotes } from './notes';

const HOUR = 60;
const DAY = 24 * HOUR;
/** "Tonight" starts here. */
const TONIGHT = 18 * HOUR;
/** Days past tomorrow the strip looks ahead. */
const LOOKAHEAD_DAYS = 14;

export interface TimelineChip {
  note: Note;
  /** "11:00" or "All day" */
  time: string;
  /** Short title: the part before " · ". */
  title: string;
  /** "in 2 h 20 min", "tomorrow" */
  rel: string;
  /** The next thing coming up. */
  next: boolean;
}

export interface TimelineSegment {
  key: string;
  /** "Now" · "+2 h" · "Tonight" · "Tomorrow" · "In 2 days" */
  label: string;
  /** "Mon 19 Oct" under day markers. */
  sub?: string;
  chips: TimelineChip[];
}

/**
 * Relative markers from "now" to the last dated note. Day markers after tomorrow
 * only appear when something happens that day, so the strip stays short.
 * Chips sit in the segment their time falls into, in time order.
 */
export function buildTimeline(list: Note[] = allNotes): TimelineSegment[] {
  const nowMin = toMinutes(today.time);
  /** Minutes since today 00:00; all-day notes count from the start of their day. */
  const at = (n: Note) => diffDays(n.day!, today.date) * DAY + (n.kind === 'time' ? toMinutes(n.time!) : 0);
  // Notes that already happened drop off; today's all-day notes stay under "Now".
  const upcoming = sortNotes(list).filter((n) => n.day && diffDays(n.day, today.date) >= 0 && (n.kind !== 'time' || at(n) >= nowMin));
  const next = upcoming.find((n) => n.kind === 'time');

  interface Span {
    key: string;
    label: string;
    sub?: string;
    from: number;
    to: number;
    /** Shown even when empty, so the strip always reads "now → tomorrow". */
    always: boolean;
  }
  const spans: Span[] = [];
  const edges = [nowMin, ...[2, 4].map((h) => nowMin + h * HOUR).filter((m) => m < TONIGHT), ...(TONIGHT > nowMin ? [TONIGHT] : [])];
  edges.forEach((from, i) => {
    const label = i === 0 ? 'Now' : from === TONIGHT ? 'Tonight' : `+${(from - nowMin) / HOUR} h`;
    spans.push({ key: `h${i}`, label, sub: i === 0 ? today.time : undefined, from: i === 0 ? -Infinity : from, to: edges[i + 1] ?? DAY, always: true });
  });
  for (let d = 1; d <= LOOKAHEAD_DAYS; d++) {
    const iso = addDays(today.date, d);
    spans.push({
      key: `d${d}`,
      label: d === 1 ? 'Tomorrow' : `In ${d} days`,
      sub: d === 1 ? fmtDayMonth(iso) : fmtDayShort(iso),
      from: d * DAY,
      to: (d + 1) * DAY,
      always: d === 1,
    });
  }

  return spans
    .map((sp) => ({
      always: sp.always,
      seg: {
        key: sp.key,
        label: sp.label,
        sub: sp.sub,
        chips: upcoming
          .filter((n) => at(n) >= sp.from && at(n) < sp.to)
          .map<TimelineChip>((n) => ({
            note: n,
            time: n.kind === 'time' ? n.time! : 'All day',
            title: n.title.split(' · ')[0],
            rel: n.day === today.date && n.kind === 'time' ? fmtCountdown(at(n) - nowMin) : relativeDay(n.day!, today.date),
            next: n === next,
          })),
      } satisfies TimelineSegment,
    }))
    .filter((x) => x.always || x.seg.chips.length > 0)
    .map((x) => x.seg);
}
