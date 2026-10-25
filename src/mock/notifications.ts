import type { SheetKind } from '../store';

/** What a notification is about; decides its icon and which Settings switch can hide it. */
export type NotifKind = 'callsheet' | 'note' | 'schedule' | 'hours' | 'link';

/** Where tapping a notification goes: a PDF in the viewer, or a bottom sheet. */
export type NotifTarget = { pdf: string } | { sheet: Extract<SheetKind, 'note' | 'hours' | 'project'>; id?: string };

export interface AppNotification {
  /** Unique across all links, so read state can be a plain list of ids. */
  id: string;
  kind: NotifKind;
  title: string;
  body?: string;
  /** When it arrived, an ISO timestamp with offset. The demo clock is Mon 19 Oct 2026, 08:40 (UTC+2). */
  at: string;
  target: NotifTarget;
  /** For an hours notification: the day (ISO) it is about. It disappears once that day has been sent. */
  day?: string;
  /** Already read when the demo starts (or after Reset). */
  read: boolean;
}

const tomorrowCallSheet = (id: string): AppNotification => ({
  id,
  kind: 'callsheet',
  title: "Tomorrow's call sheet is out",
  body: 'Shoot day 8 · call 08:00 at Café Prückel',
  at: '2026-10-19T07:55:00+02:00',
  target: { pdf: 'Callsheet_D08_10-20.pdf' },
  read: false,
});

const cateringNote = (id: string): AppNotification => ({
  id,
  kind: 'note',
  title: 'New smart note: Catering for shoot day 8',
  body: 'Delivery 12:00 to set',
  at: '2026-10-19T08:28:00+02:00',
  target: { sheet: 'note', id: 'cat' },
  read: false,
});

/** Notifications of each crew link. A link that is not listed has none. */
const byLink: Record<string, AppNotification[]> = {
  'lk-ferry-me': [
    tomorrowCallSheet('ferry-me-callsheet-d8'),
    cateringNote('ferry-me-note-cat'),
    {
      id: 'ferry-me-hours-sun',
      kind: 'hours',
      day: '2026-10-18',
      title: 'Sun 18 hours not sent',
      body: 'Still a draft. Send them so production can approve.',
      at: '2026-10-19T07:30:00+02:00',
      target: { sheet: 'hours', id: 'week' },
      read: false,
    },
    {
      id: 'ferry-me-link-hinterland',
      kind: 'link',
      title: 'Your link for Hinterland Nights expires in 3 days',
      body: 'Ends Thu 22 Oct. Ask Amber Pictures for a new one.',
      at: '2026-10-18T18:00:00+02:00',
      target: { sheet: 'project' },
      read: false,
    },
    {
      id: 'ferry-me-schedule-v4',
      kind: 'schedule',
      title: 'Shooting schedule v4 is out',
      body: 'Updated by production',
      at: '2026-10-16T17:10:00+02:00',
      target: { pdf: 'Shooting-Schedule_v4.pdf' },
      read: true,
    },
  ],
  'lk-hinterland-me': [
    {
      id: 'hinterland-me-link-expiring',
      kind: 'link',
      title: 'This link expires in 3 days',
      body: 'Ends Thu 22 Oct. Ask Amber Pictures for a new one.',
      at: '2026-10-18T18:00:00+02:00',
      target: { sheet: 'project' },
      read: false,
    },
  ],
  'lk-ferry-bianca': [tomorrowCallSheet('ferry-bianca-callsheet-d8'), { ...cateringNote('ferry-bianca-note-cat'), read: true }],
  'lk-ferry-samir': [
    tomorrowCallSheet('ferry-samir-callsheet-d8'),
    {
      id: 'ferry-samir-hours-sun',
      kind: 'hours',
      day: '2026-10-18',
      title: 'Sun 18 hours are still a draft',
      body: 'Check them with Samir and send.',
      at: '2026-10-19T07:30:00+02:00',
      target: { sheet: 'hours', id: 'week' },
      read: false,
    },
  ],
};

export const notificationsFor = (linkId: string): AppNotification[] => byLink[linkId] ?? [];

/** Read state at the start of the demo: the ids already read, per link. */
export const initialRead = (): Record<string, string[]> =>
  Object.fromEntries(Object.entries(byLink).map(([linkId, list]) => [linkId, list.filter((n) => n.read).map((n) => n.id)]));
