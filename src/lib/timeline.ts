import { notes as allNotes, today } from '../mock';
import type { Note } from '../mock';
import { diffDays, fmtCountdown, toMinutes, weekday } from './dates';
import { sortNotes, TYPE_LABEL } from './notes';

const HOUR = 60;
const DAY = 24 * HOUR;
/** "Tonight" starts here. */
const TONIGHT = 18 * HOUR;
/** Pixels between two neighbouring ruler marks. Past the last mark a day is one gap. */
export const MARK_GAP = 84;
/** The ruler runs on this long after the last note, so the playhead can pass it. */
const TAIL = 12 * HOUR;
/** The first note sits at least this far (px) from Now, so it is never mistaken for Now. */
export const REST_PX = 4;
/** Notes keep at least this much room (px) on the ruler, so each one has a spot the playhead can stop on. */
export const STOP_GAP = 3;
/** Arrow keys step to the next note further than this (px) from the playhead. Smaller than STOP_GAP, so ties never trap them. */
export const NAV_EPS = STOP_GAP / 2;

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
}

/** Which note the playhead is on: the nearest one, ahead or behind. Null (no Preview) means Now is nearest. */
export interface Preview {
  index: number;
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
  return { marks, past, stops, length: Math.ceil(Math.max(xAt(end), prevX + STOP_GAP * 4)) };
}

/**
 * The stop nearest the playhead, with Now (x = 0) as a stop too: -1 for Now, else an index into `stops`.
 * Equally near, the one ahead wins. The preview and the snap both use this, so what the card shows is what the ruler locks onto.
 */
function nearestStop(s: Scrub, x: number): number {
  let best = -1;
  let bestD = Math.abs(x);
  s.stops.forEach((st, i) => {
    const d = Math.abs(st.x - x);
    if (d < bestD || (d === bestD && st.x >= x)) {
      best = i;
      bestD = d;
    }
  });
  return best;
}

/** The note nearest the playhead, or null while Now is nearest. */
export function previewAt(s: Scrub, x: number): Preview | null {
  const index = nearestStop(s, x);
  if (index < 0) return null;
  return { index };
}

export const samePreview = (a: Preview | null, b: Preview | null) => a === b || (!!a && !!b && a.index === b.index);

/** "2/3" when the note is one of a cluster, else null. */
const clusterTag = (s: Scrub, index: number) => {
  const c = clusters(s.stops)[index];
  return c && `${c.pos}/${c.n}`;
};

/**
 * The caption next to "Back to now": "2/3 · Hotel · Wed 15:00", short enough to keep the day and time
 * on one line at 360 px in every font. The count is left out when the note stands alone.
 */
export function previewLine(s: Scrub, p: Preview): string {
  const stop = s.stops[p.index];
  if (!stop) return ''; // a preview left over from an earlier ruler
  return [clusterTag(s, p.index), TYPE_LABEL[stop.note.type], stop.when].filter(Boolean).join(' · ');
}

/** The same for a screen reader, with the count spelled out and how far away the note is: "note 2 of 3, Hotel, in 2 days, Wed 15:00". */
export function previewSpoken(s: Scrub, p: Preview): string {
  const stop = s.stops[p.index];
  if (!stop) return '';
  const c = clusters(s.stops)[p.index];
  return [c && `note ${c.pos} of ${c.n}`, TYPE_LABEL[stop.note.type], stop.rel, stop.when].filter(Boolean).join(', ');
}

/** Notes closer together than this (px) on the ruler overlap as dots (10 px wide), so they get one count badge. */
export const CLUSTER_PX = 12;

/** One note's place in a cluster of tied notes. */
export interface ClusterInfo {
  /** Index of the first stop in the cluster. */
  lead: number;
  /** Notes in the cluster. */
  n: number;
  /** This note's place in it, 1-based. */
  pos: number;
  /** px from the first marker to the last one. */
  span: number;
}

/**
 * Per stop: its cluster if it is one of two or more notes that follow one another within CLUSTER_PX, else null.
 * The count badge sits on the lead; when the playhead locks on a member, the whole cluster fans out.
 */
export function clusters(stops: ScrubStop[]): (ClusterInfo | null)[] {
  const out: (ClusterInfo | null)[] = stops.map(() => null);
  let from = 0;
  for (let i = 1; i <= stops.length; i++) {
    if (i < stops.length && stops[i].x - stops[i - 1].x < CLUSTER_PX) continue;
    const n = i - from;
    if (n > 1) for (let k = from; k < i; k++) out[k] = { lead: from, n, pos: k - from + 1, span: stops[i - 1].x - stops[from].x };
    from = i;
  }
  return out;
}

/** Where the ruler settles once it stops: the nearest note or Now, so that marker sits exactly under the playhead. */
export function snapTarget(s: Scrub, x: number): number {
  const i = nearestStop(s, x);
  return i < 0 ? 0 : s.stops[i].x;
}

/**
 * One stop on from `x`, like an arrow key or a wheel notch: the next note further than NAV_EPS ahead,
 * or the previous note behind (Now when there is none). Not symmetric on purpose: going forward from the last
 * note gives null (nowhere to go), going back from the first gives 0 (Now is always a place to go).
 */
export function stepTarget(s: Scrub, x: number, dir: 1 | -1): number | null {
  if (dir > 0) return s.stops.find((st) => st.x > x + NAV_EPS)?.x ?? null;
  return [...s.stops].reverse().find((st) => st.x < x - NAV_EPS)?.x ?? 0;
}
