import { notes as allNotes, project, today } from '../mock';
import type { Fact, Note, NoteType } from '../mock';
import { fmtCountdown, fmtDayMonth, fmtDayShort, relativeDay, toMinutes, diffDays } from './dates';

export const TYPE_LABEL: Record<NoteType, string> = {
  flight: 'Flight',
  hotel: 'Hotel',
  rental: 'Rental',
  appointment: 'Appointment',
  plain: 'Note',
};

const sortKey = (n: Note) => (n.day ? n.day + ' ' + (n.kind === 'time' ? n.time : '00:00') : '9999');
export const sortNotes = (list: Note[]) => [...list].sort((a, b) => sortKey(a).localeCompare(sortKey(b)));

export const minutesUntil = (n: Note) =>
  n.day === today.date && n.time ? toMinutes(n.time) - toMinutes(today.time) : Infinity;

/** "Today, in 2 h 20 min" · "Tue 20 Oct, tomorrow" · "No date" */
export function whenLabel(n: Note): string {
  if (!n.day) return 'No date';
  if (n.day === today.date) {
    const m = minutesUntil(n);
    return m !== Infinity && m > 0 ? `Today, ${fmtCountdown(m)}` : 'Today';
  }
  return `${fmtDayMonth(n.day)}, ${relativeDay(n.day, today.date)}`;
}

export const timeText = (n: Note) => (n.kind === 'time' ? n.time! : n.kind === 'allday' ? 'All day' : '—');
export const timeSub = (n: Note) => n.timeNote ?? (n.kind === 'undated' ? 'no date' : '');

/** Notes that have a ticket get the "Ticket" quick button; other attachments get "PDF". */
export function quickAction(n: Note): 'ticket' | 'pdf' | null {
  if (!n.attachments.length) return null;
  return n.type === 'flight' ? 'ticket' : 'pdf';
}

/** Notes whose ticket carries a scannable code (shown as a QR preview). */
export const hasScanCode = (n: Note) => quickAction(n) === 'ticket';

/** Call times and travel come first. */
const PRIORITY_TYPES: NoteType[] = ['appointment', 'flight', 'hotel'];

export interface SmartNotes {
  hero: Note | undefined;
  top: Note[];
  rest: { label: string; sub: string; notes: Note[] }[];
  restCount: number;
}

export function smartNotes(list: Note[] = allNotes): SmartNotes {
  const sorted = sortNotes(list);
  const hero = sorted.find((n) => n.type === 'appointment' && n.day === today.date && minutesUntil(n) > 0);
  const upcoming = sorted.filter((n) => n !== hero && (!n.day || diffDays(n.day, today.date) >= 0));
  const top = upcoming.filter((n) => n.kind === 'time' && PRIORITY_TYPES.includes(n.type)).slice(0, 3);
  const restNotes = upcoming.filter((n) => !top.includes(n));
  const groups = new Map<string, Note[]>();
  restNotes.forEach((n) => {
    const k = n.day ?? 'undated';
    groups.set(k, [...(groups.get(k) ?? []), n]);
  });
  const rest = [...groups.entries()].map(([day, ns]) => {
    if (day === 'undated') return { label: 'No date', sub: 'always valid', notes: ns };
    const rel = relativeDay(day, today.date);
    if (rel === 'tomorrow') return { label: 'Tomorrow', sub: fmtDayMonth(day), notes: ns };
    return { label: fmtDayMonth(day), sub: project.dayLabels[day] ?? rel, notes: ns };
  });
  return { hero, top, rest, restCount: restNotes.length };
}

/** Second line of a content card, e.g. "Appointment · tomorrow" or "Flight · OS487 · Vienna → Funchal". */
export function cardSubtitle(n: Note) {
  // Flights show the full route instead of the type: the coloured chip already says "flight".
  if (n.type === 'flight') return n.subtitle;
  const detail = n.timeNote ? n.timeNote.toLowerCase() : n.day ? relativeDay(n.day, today.date) : '';
  return `${TYPE_LABEL[n.type]} · ${detail}`;
}

export interface CardTile {
  key: string;
  label: string;
  value: string;
  action?: 'copy' | 'map' | 'attachment';
  unconfirmed?: boolean;
  wide: boolean;
}

/**
 * The fact tiles on a content card: up to three, preferring facts you act on
 * (copy, map, not yet confirmed), filled up in data order. Map facts and the
 * attachment go last and span both columns.
 */
export function cardTiles(n: Note): CardTile[] {
  const actionable = (f: Fact) => !!f.action || !!f.unconfirmed;
  // A ticket with a code gets its own QR preview instead of an attachment tile.
  const att = hasScanCode(n) ? undefined : n.attachments[0];
  const slots = att ? 2 : 3;
  const chosen = n.facts.filter(actionable).slice(0, slots);
  for (const f of n.facts) {
    if (chosen.length >= slots) break;
    if (!chosen.includes(f)) chosen.push(f);
  }
  const ordered = n.facts.filter((f) => chosen.includes(f));
  const tiles: CardTile[] = ordered.map((f) => ({
    key: f.label,
    label: f.label,
    value: f.value,
    action: f.action,
    unconfirmed: f.unconfirmed,
    wide: f.action === 'map',
  }));
  tiles.sort((a, b) => Number(a.wide) - Number(b.wide));
  if (att) tiles.push({ key: att.file, label: n.type === 'flight' ? 'Ticket' : 'Attachment', value: att.file, action: 'attachment', wide: true });
  return tiles;
}

/** First sentence of the note text, for the one-line note on a card. */
export const firstSentence = (text: string) => {
  const m = text.match(/^[^.!?\n]*[.!?]?/);
  return (m ? m[0] : text).trim();
};

export const dayStub = (n: Note) => (n.day ? fmtDayShort(n.day) : '');
