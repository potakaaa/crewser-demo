import type { CrewLink } from './types';

/**
 * Crew links the phone holds. Each link is its own credential for one person on one
 * project: the app user's own links, plus camera-team colleagues whose hours the 1st AC enters.
 * The demo is frozen to Mon 19 Oct 2026.
 */
export const links: CrewLink[] = [
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
    token: 'cw_7Hk2mQxPvR4tNa9e',
    expiresAt: '2026-11-30T23:59:00',
    status: 'active',
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
    token: 'cw_Zq8Lw3cYb1uDs6Jf',
    expiresAt: '2026-10-22T23:59:00',
    status: 'expiring',
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
    token: 'cw_Ep5Tn0gXk7Vm2Ra4',
    expiresAt: '2026-10-02T23:59:00',
    status: 'expired',
  },
  {
    id: 'lk-ferry-bianca',
    projectId: 'p-ferry',
    projectName: 'The Last Ferry',
    production: 'Nordlicht Film',
    personName: 'Slate Bianca',
    initials: 'SB',
    department: 'Camera',
    position: '2nd AC',
    isMe: false,
    token: 'cw_Bc3Yd8hNs1Fj6Wu0',
    expiresAt: '2026-11-30T23:59:00',
    status: 'active',
  },
  {
    id: 'lk-ferry-samir',
    projectId: 'p-ferry',
    projectName: 'The Last Ferry',
    production: 'Nordlicht Film',
    personName: 'Mag Samir',
    initials: 'MS',
    department: 'Camera',
    position: 'Camera Loader',
    isMe: false,
    token: 'cw_Sm9Kp4zLe2Qt7Xb5',
    expiresAt: '2026-11-30T23:59:00',
    status: 'active',
  },
];

export const linkById = (id: string) => links.find((l) => l.id === id);
