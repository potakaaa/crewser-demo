import type { PdfDoc, Person, Project, Today, WorkDay } from './types';

/** Last 7 days, Mon 12 – Sun 18 Oct. Every statistic is derived from this array. */
export const week: WorkDay[] = [
  { date: '2026-10-12', hours: 10.25, night: 0 },
  { date: '2026-10-13', hours: 11.5, night: 0 },
  { date: '2026-10-14', hours: 12.0, night: 0 },
  { date: '2026-10-15', hours: 10.5, night: 0 },
  { date: '2026-10-16', hours: 12.5, night: 2.5 },
  { date: '2026-10-17', hours: 0, night: 0 },
  { date: '2026-10-18', hours: 10.75, night: 1.0 },
];

export const person: Person = {
  firstName: 'Florentina',
  displayName: 'Focus Florentina',
  initials: 'FF',
  position: '1st AC',
};

export const project: Project = {
  name: '[Project name]',
  dailyTargetHours: 10,
  totalShootDays: 12,
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
};
