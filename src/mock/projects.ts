import { today } from './data';
import type { CrewLink, LinkStatus } from './types';

/**
 * Crew links the phone holds. Each link is its own credential for one person on one
 * project: the app user's own links, plus camera-team colleagues whose hours the 1st AC enters.
 * The demo is frozen to Mon 19 Oct 2026.
 */
const rawLinks: Omit<CrewLink, 'status'>[] = [
  {
    id: 'lk-ferry-me',
    projectId: 'p-ferry',
    projectName: 'The Last Ferry',
    production: 'Nordlicht Film',
    personName: 'Focus Florentina',
    initials: 'FF',
    department: 'Camera',
    position: '1st AC',
    isMe: true,
    token: 'cw_demo_ferry_florentina',
    expiresAt: '2026-11-30T23:59:00+01:00',
  },
  {
    id: 'lk-hinterland-me',
    projectId: 'p-hinterland',
    projectName: 'Hinterland Nights',
    production: 'Amber Pictures',
    personName: 'Focus Florentina',
    initials: 'FF',
    department: 'Camera',
    position: '1st AC',
    isMe: true,
    token: 'cw_demo_hinterland_florentina',
    expiresAt: '2026-10-22T23:59:00+02:00',
  },
  {
    id: 'lk-olympia-me',
    projectId: 'p-olympia',
    projectName: 'Café Olympia (commercial)',
    production: 'Reel Vienna',
    personName: 'Focus Florentina',
    initials: 'FF',
    department: 'Camera',
    position: '1st AC',
    isMe: true,
    token: 'cw_demo_olympia_florentina',
    expiresAt: '2026-10-02T23:59:00+02:00',
  },
  {
    id: 'lk-seeblick-me',
    projectId: 'p-seeblick',
    projectName: 'Seeblick (TV movie)',
    production: 'Alpenblick TV',
    personName: 'Focus Florentina',
    initials: 'FF',
    department: 'Camera',
    position: '1st AC',
    isMe: true,
    token: 'cw_demo_seeblick_florentina',
    expiresAt: '2026-12-15T23:59:00+01:00',
    revokedAt: '2026-10-12T10:20:00+02:00',
  },
  {
    id: 'lk-ferry-bianca',
    projectId: 'p-ferry',
    projectName: 'The Last Ferry',
    production: 'Nordlicht Film',
    personName: 'Slate Bianca',
    firstName: 'Bianca',
    initials: 'SB',
    department: 'Camera',
    position: '2nd AC',
    isMe: false,
    token: 'cw_demo_ferry_bianca',
    expiresAt: '2026-11-30T23:59:00+01:00',
  },
  {
    id: 'lk-ferry-samir',
    projectId: 'p-ferry',
    projectName: 'The Last Ferry',
    production: 'Nordlicht Film',
    personName: 'Mag Samir',
    firstName: 'Samir',
    initials: 'MS',
    department: 'Camera',
    position: 'Camera Loader',
    isMe: false,
    token: 'cw_demo_ferry_samir',
    expiresAt: '2026-11-30T23:59:00+01:00',
  },
];

/** The demo clock: Mon 19 Oct 2026, 08:40 in Vienna (CEST, UTC+2). */
const NOW = Date.parse(`${today.date}T${today.time}:00+02:00`);
const DAY_MS = 86_400_000;
/** A link counts as "expiring" this many days before it ends. */
const EXPIRING_DAYS = 7;

/** Status follows from the end date and the frozen demo date, never from a stored label. */
export function linkStatus(link: Pick<CrewLink, 'expiresAt' | 'revokedAt'>, now = NOW): LinkStatus {
  if (link.revokedAt) return 'revoked';
  const left = Date.parse(link.expiresAt) - now;
  // An unreadable date is never trusted as valid.
  if (!(left > 0)) return 'expired';
  return left <= EXPIRING_DAYS * DAY_MS ? 'expiring' : 'active';
}

export const links: CrewLink[] = rawLinks.map((l) => ({ ...l, status: linkStatus(l) }));

export const linkById = (id: string) => links.find((l) => l.id === id);
