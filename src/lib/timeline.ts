import { notes as allNotes, today } from '../mock';
import type { Note } from '../mock';
import { diffDays, fmtCountdown, toMinutes, weekday } from './dates';
import { sortNotes } from './notes';

const HOUR = 60;
const DAY = 24 * HOUR;
/** "Tonight" starts here. */
const TONIGHT = 18 * HOUR;
/** Pixels between two neighbouring ruler marks. Past the last mark a day is one gap. */
export const MARK_GAP = 84;
/** The ruler runs on this long after the last note, so the playhead can pass it. */
const TAIL = 12 * HOUR;
/** Closer to Now than this (px) counts as "back at Now". */
export const REST_PX = 4;
/** Notes keep at least this much room (px) on the ruler, so each one has a spot the playhead can stop on. */
export const STOP_GAP = 3;
/** How close (px) the playhead must be to a note to count as on it: scrollLeft sits on the screen's pixel grid. */
const PICK_EPS = 1;
/** Arrow keys step to the next note further than this (px) from the playhead. Smaller than STOP_GAP, so ties never trap them. */
export const NAV_EPS = STOP_GAP / 2;
/** A note further than this past the playhead is "nothing else until …". */
const QUIET = 3 * HOUR;

export interface RulerMark {
  key: string;
  /** "Now" · "+2 h" · "Tonight" · "Tomorrow" · "+2 days" */
  label: string;
  /** Minutes from now. */
  min: number;
  x: number;
}

export interface ScrubStop {
  note: Note;
  /** Minutes from now. */
  min: number;
  /** Position on the ruler, px from Now. */
  x: number;
  /** "Tue 08:00" · "Tue, all day" */
  when: string;
  /** "in 4 h" · "in 2 days" */
  rel: string;
}

/** A note from earlier today, drawn dimmed before Now. Decoration only: the ruler cannot scroll there. */
export interface PastDot {
  note: Note;
  /** Negative: px before Now. */
  x: number;
}

export interface Scrub {
  marks: RulerMark[];
  past: PastDot[];
  stops: ScrubStop[];
  /** Ruler length in px, Now to the end. */
  length: number;
  minAt: (x: number) => number;
}

/** Which note the playhead is on. index === stops.length means nothing is left. */
export interface Preview {
  index: number;
  /** The note is a long way past the playhead. */
  quiet: boolean;
}

/** "in 20 min" · "in 4 h" · "in 2 days": short enough for a one-line caption. */
function shortRel(min: number): string {
  if (min <= 0) return 'now';
  if (min < HOUR) return `in ${min} min`;
  if (min < 6 * HOUR) return fmtCountdown(min);
  if (min < 36 * HOUR) return `in ${Math.round(min / HOUR)} h`;
  return `in ${Math.round(min / DAY)} days`;
}

/**
 * The ruler behind the preview scrubber. Marks sit evenly apart (Now, +2 h, +4 h, Tonight,
 * Tomorrow, +2 days) and time between them is stretched to fit, so the next few hours get
 * the room. Notes land on it by their time; all-day notes at the start of their day.
 */
export function buildScrub(list: Note[] = allNotes): Scrub {
  const nowMin = toMinutes(today.time);
  /** Minutes since today 00:00; all-day notes count from the start of their day. */
  const at = (n: Note) => diffDays(n.day!, today.date) * DAY + (n.kind === 'time' ? toMinutes(n.time!) : 0);
  // Notes that already happened drop off; today's all-day notes stay at Now.
  const upcoming = sortNotes(list).filter((n) => n.day && diffDays(n.day, today.date) >= 0 && (n.kind !== 'time' || at(n) >= nowMin));

  const mins: { label: string; min: number }[] = [{ label: 'Now', min: 0 }];
  [2, 4].forEach((h) => nowMin + h * HOUR < TONIGHT && mins.push({ label: `+${h} h`, min: h * HOUR }));
  if (TONIGHT > nowMin) mins.push({ label: 'Tonight', min: TONIGHT - nowMin });
  mins.push({ label: 'Tomorrow', min: DAY - nowMin }, { label: '+2 days', min: 2 * DAY - nowMin });
  const marks = mins.map<RulerMark>((m, i) => ({ key: `m${i}`, ...m, x: i * MARK_GAP }));
  const last = marks[marks.length - 1];

  const xAt = (min: number) => {
    if (min <= 0) return 0;
    for (let i = 1; i < marks.length; i++) {
      if (min <= marks[i].min) return marks[i - 1].x + ((min - marks[i - 1].min) / (marks[i].min - marks[i - 1].min)) * MARK_GAP;
    }
    return last.x + ((min - last.min) / DAY) * MARK_GAP;
  };
  const minAt = (x: number) => {
    if (x <= 0) return 0;
    for (let i = 1; i < marks.length; i++) {
      if (x <= marks[i].x) return marks[i - 1].min + ((x - marks[i - 1].x) / MARK_GAP) * (marks[i].min - marks[i - 1].min);
    }
    return last.min + ((x - last.x) / MARK_GAP) * DAY;
  };

  // Notes at the same time, or just after Now, would share a spot or sit under the "back at Now" zone
  // and never be reachable: each is nudged right of the one before it.
  let prevX = REST_PX - STOP_GAP + 1;
  const stops = upcoming.map<ScrubStop>((n) => {
    const min = Math.max(at(n) - nowMin, 0);
    const day = weekday(n.day!);
    const x = Math.max(xAt(min), prevX + STOP_GAP);
    prevX = x;
    return {
      note: n,
      min,
      x,
      when: n.kind === 'time' ? `${day} ${n.time}` : `${day}, all day`,
      rel: shortRel(min),
    };
  });

  // Earlier today, at the scale of the first stretch (2 h per gap), left of Now.
  const pxPerMin = MARK_GAP / (marks[1]?.min ?? 2 * HOUR);
  const past = sortNotes(list)
    .filter((n) => n.day === today.date && n.kind === 'time' && at(n) < nowMin)
    .map<PastDot>((n) => ({ note: n, x: -(nowMin - at(n)) * pxPerMin }));

  const end = Math.max(last.min, (stops[stops.length - 1]?.min ?? 0) + TAIL);
  return { marks, past, stops, length: Math.ceil(Math.max(xAt(end), prevX + STOP_GAP * 4)), minAt };
}

/** The note at or after the playhead, or null while it rests on Now. */
export function previewAt(s: Scrub, x: number): Preview | null {
  if (x < REST_PX) return null;
  const index = s.stops.findIndex((st) => st.x >= x - PICK_EPS);
  const i = index < 0 ? s.stops.length : index;
  return { index: i, quiet: i < s.stops.length && s.stops[i].min - s.minAt(x) > QUIET };
}

export const samePreview = (a: Preview | null, b: Preview | null) => a === b || (!!a && !!b && a.index === b.index && a.quiet === b.quiet);

/** The caption under the card: "Preview · in 4 h · Tue 08:00" or "Nothing else until Tue 08:00". */
export function previewLine(s: Scrub, p: Preview): string {
  const stop = s.stops[p.index];
  if (!stop) {
    const lastStop = s.stops[s.stops.length - 1];
    return lastStop ? `Nothing else after ${lastStop.when}` : 'Nothing else coming up';
  }
  return p.quiet ? `Nothing else until ${stop.when}` : `Preview · ${stop.rel} · ${stop.when}`;
}
