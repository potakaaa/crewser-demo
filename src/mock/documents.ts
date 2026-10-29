import type { Doc, PdfDoc } from './types';
import { fmtDayMonth, pad2 } from '../lib/dates';

/** Shoot days in Vienna. Sat 17 Oct was the day off, so there is no call sheet for it. */
const SHOOT_DAYS: { n: number; day: string; updated: string; size: string; version: number; isNew?: boolean }[] = [
  { n: 1, day: '2026-10-12', updated: '2026-10-11T19:40', size: '212 KB', version: 1 },
  { n: 2, day: '2026-10-13', updated: '2026-10-12T20:05', size: '208 KB', version: 1 },
  { n: 3, day: '2026-10-14', updated: '2026-10-13T19:52', size: '215 KB', version: 2 },
  { n: 4, day: '2026-10-15', updated: '2026-10-14T20:11', size: '204 KB', version: 1 },
  { n: 5, day: '2026-10-16', updated: '2026-10-15T21:03', size: '219 KB', version: 1 },
  { n: 6, day: '2026-10-18', updated: '2026-10-17T18:30', size: '211 KB', version: 1 },
  { n: 7, day: '2026-10-19', updated: '2026-10-18T20:20', size: '223 KB', version: 2 },
  { n: 8, day: '2026-10-20', updated: '2026-10-19T07:55', size: '226 KB', version: 1 },
];


const callsheets: Doc[] = SHOOT_DAYS.map((d) => ({
  id: `cs${d.n}`,
  file: `Callsheet_D${pad2(d.n)}_${d.day.slice(5)}.pdf`,
  title: `Call sheet · Shoot day ${d.n}`,
  kind: 'callsheet',
  day: d.day,
  shootDay: d.n,
  updated: d.updated,
  size: d.size,
  version: d.version,
  isNew: d.isNew,
}));

/** The movement order for today's flight to Madeira: productions issue a call sheet for travel days too. */
const travelSheet: Doc = {
  id: 'cs-travel',
  file: 'Callsheet_Travel_10-21.pdf',
  title: 'Call sheet · Travel day',
  kind: 'callsheet',
  day: '2026-10-21',
  updated: '2026-10-20T20:40',
  size: '184 KB',
  version: 1,
  isNew: true,
};

const others: Doc[] = [
  { id: 'sched', file: 'Shooting-Schedule_v4.pdf', title: 'Shooting schedule', kind: 'schedule', updated: '2026-10-16T17:10', size: '348 KB', version: 4, isNew: true },
  { id: 'oneliner', file: 'One-liner_v3.pdf', title: 'Script one-liner', kind: 'schedule', updated: '2026-10-05T11:20', size: '96 KB', version: 3 },
  { id: 'risk', file: 'Risk-Assessment_Madeira.pdf', title: 'Risk assessment · Madeira', kind: 'safety', updated: '2026-10-14T09:45', size: '412 KB', version: 2 },
  { id: 'map', file: 'Location-Map_Funchal.pdf', title: 'Location map · Funchal', kind: 'safety', updated: '2026-10-13T15:30', size: '1.2 MB', version: 1 },
  { id: 'crewlist', file: 'Crew-List_v6.pdf', title: 'Crew list', kind: 'other', updated: '2026-10-15T12:00', size: '134 KB', version: 6 },
];

/** Newest first within each kind; the screen groups them. */
export const docs: Doc[] = [travelSheet, ...callsheets.slice().reverse(), ...others];

const KICKER: Record<Doc['kind'], string> = {
  callsheet: 'CALL SHEET',
  schedule: 'SHOOTING SCHEDULE',
  safety: 'HEALTH & SAFETY',
  other: 'PRODUCTION DOCUMENT',
};

/** One entry per document so the PDF viewer can open every file. */
export const docPdfs: Record<string, PdfDoc> = Object.fromEntries(
  docs.map((d) => [
    d.file,
    {
      file: d.file,
      kicker: KICKER[d.kind],
      title: d.title,
      line: `${d.day ? `${fmtDayMonth(d.day)} 2026` : `Updated ${d.updated.slice(0, 10)}`} · The Last Ferry`,
      version: d.version,
    },
  ]),
);
