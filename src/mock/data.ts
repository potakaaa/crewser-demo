import { docPdfs } from './documents';
import type { PdfDoc, Person, Project, Today, WorkDay } from './types';

/**
 * Every logged day so far: camera prep at the rental house, then shoot days 1–6.
 * Sat 17 is the day off. Hours per shoot day: Mon 10.25 · Tue 11.5 · Wed 12 ·
 * Thu 10.5 · Fri 12.5 (2.5 at night) · Sun 10.75 (1 at night).
 */
export const workdays: WorkDay[] = [
  { date: '2026-10-07', kind: 'prep', start: '09:00', end: '18:30', breakMin: 30, status: 'approved' },
  { date: '2026-10-08', kind: 'prep', start: '09:00', end: '19:00', breakMin: 30, status: 'approved' },
  { date: '2026-10-09', kind: 'prep', start: '08:30', end: '19:00', breakMin: 30, status: 'approved' },
  { date: '2026-10-12', kind: 'shoot', start: '07:00', end: '18:00', breakMin: 45, status: 'approved' },
  { date: '2026-10-13', kind: 'shoot', start: '07:00', end: '19:30', breakMin: 60, status: 'approved' },
  { date: '2026-10-14', kind: 'shoot', start: '06:00', end: '18:30', breakMin: 30, status: 'approved' },
  { date: '2026-10-15', kind: 'shoot', start: '08:00', end: '19:00', breakMin: 30, status: 'approved' },
  { date: '2026-10-16', kind: 'shoot', start: '11:30', end: '00:30', breakMin: 30, status: 'submitted' },
  { date: '2026-10-18', kind: 'shoot', start: '11:45', end: '23:00', breakMin: 30, status: 'draft' },
];

export const person: Person = {
  id: 'ff',
  firstName: 'Florentina',
  displayName: 'Focus Florentina',
  initials: 'FF',
  position: '1st AC',
};

export const project: Project = {
  name: 'The Last Ferry',
  dailyTargetHours: 10,
  totalShootDays: 12,
  minRestHours: 11,
  dayLabels: { '2026-10-21': 'travel to Madeira' },
};

/** The demo is frozen to Mon 19 Oct 2026, 08:40, so it never depends on the real clock. */
export const today: Today = {
  date: '2026-10-19',
  time: '08:40',
  shootDay: 7,
  lastSynced: '08:12',
  defaultBreakMin: 30,
};

export const pdfs: Record<string, PdfDoc> = {
  'Ticket_OS487.pdf': {
    file: 'Ticket_OS487.pdf',
    kicker: 'E-TICKET / BOARDING PASS',
    title: 'OS487 · VIE → FNC',
    line: 'Wed 21 Oct 2026 · departs 12:05',
  },
  'Reservation_FNC-4471.pdf': {
    file: 'Reservation_FNC-4471.pdf',
    kicker: 'RESERVATION CONFIRMATION',
    title: 'Van, 9 seats',
    line: 'FNC-4471 · 21 Oct 16:30 – 26 Oct 14:00',
  },
  ...docPdfs,
};
