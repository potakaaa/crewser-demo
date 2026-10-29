// Tiny date helpers on ISO "YYYY-MM-DD" strings, computed in UTC so the time zone never matters.

const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAY_MS = 86_400_000;

const toDate = (iso: string) => new Date(iso + 'T00:00:00Z');
const toIso = (d: Date) => d.toISOString().slice(0, 10);

export const addDays = (iso: string, n: number) => toIso(new Date(toDate(iso).getTime() + n * DAY_MS));
export const diffDays = (a: string, b: string) => Math.round((toDate(a).getTime() - toDate(b).getTime()) / DAY_MS);
export const weekday = (iso: string) => WD[toDate(iso).getUTCDay()];
export const dayOfMonth = (iso: string) => toDate(iso).getUTCDate();
export const monthShort = (iso: string) => MON[toDate(iso).getUTCMonth()];

/** "Tue 20" */
export const fmtDayShort = (iso: string) => `${weekday(iso)} ${dayOfMonth(iso)}`;
/** "Tue 20 Oct" */
export const fmtDayMonth = (iso: string) => `${fmtDayShort(iso)} ${monthShort(iso)}`;

/** "2026-10-01" for any day in October 2026. */
export const firstOfMonth = (iso: string) => iso.slice(0, 8) + '01';

export function addMonths(iso: string, n: number): string {
  const d = toDate(firstOfMonth(iso));
  return toIso(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1)));
}

/** Monday-first grid of whole weeks covering the month of `iso` (5 or 6 rows). */
export function monthGrid(iso: string): string[] {
  const first = firstOfMonth(iso);
  const start = mondayOf(first);
  const nextMonth = addMonths(first, 1);
  const days: string[] = [];
  for (let d = start; d < nextMonth || days.length % 7 !== 0; d = addDays(d, 1)) days.push(d);
  return days;
}

export const isSameMonth = (a: string, b: string) => a.slice(0, 7) === b.slice(0, 7);

/** "October 2026" */
export const fmtMonthYear = (iso: string) => `${MONTH[toDate(iso).getUTCMonth()]} ${toDate(iso).getUTCFullYear()}`;

/** Monday of the week containing `iso`. */
export const mondayOf = (iso: string) => addDays(iso, -((toDate(iso).getUTCDay() + 6) % 7));

export function isoWeek(iso: string): number {
  const d = toDate(iso);
  const thursday = new Date(d.getTime() + (3 - ((d.getUTCDay() + 6) % 7)) * DAY_MS);
  const jan1 = Date.UTC(thursday.getUTCFullYear(), 0, 1);
  return Math.floor((thursday.getTime() - jan1) / DAY_MS / 7) + 1;
}

/** "October 2026", or "Oct – Nov 2026" when the week spans two months. */
export function monthLabel(startIso: string, endIso: string): string {
  const a = toDate(startIso);
  const b = toDate(endIso);
  if (a.getUTCMonth() === b.getUTCMonth()) return `${MONTH[a.getUTCMonth()]} ${a.getUTCFullYear()}`;
  return `${MON[a.getUTCMonth()]} – ${MON[b.getUTCMonth()]} ${b.getUTCFullYear()}`;
}

/** "12–18 Oct" */
export function rangeLabel(startIso: string, endIso: string): string {
  if (monthShort(startIso) === monthShort(endIso)) return `${dayOfMonth(startIso)}–${dayOfMonth(endIso)} ${monthShort(endIso)}`;
  return `${dayOfMonth(startIso)} ${monthShort(startIso)} – ${dayOfMonth(endIso)} ${monthShort(endIso)}`;
}

export function relativeDay(iso: string, todayIso: string): string {
  const n = diffDays(iso, todayIso);
  if (n === 0) return 'today';
  if (n === 1) return 'tomorrow';
  if (n === -1) return 'yesterday';
  return n > 1 ? `in ${n} days` : `${-n} days ago`;
}

export const pad2 = (n: number) => String(n).padStart(2, '0');

/** "HH:MM" for minutes since midnight. */
export const fmtHHMM = (min: number) => `${pad2(Math.floor(min / 60))}:${pad2(min % 60)}`;

export const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

/** "in 2 h 20 min" */
export function fmtCountdown(minutes: number): string {
  if (minutes <= 0) return 'now';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `in ${m} min`;
  return m ? `in ${h} h ${m} min` : `in ${h} h`;
}
