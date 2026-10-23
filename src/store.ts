import { useMemo } from 'react';
import { create } from 'zustand';
import { linkById, links, noteById, pdfs, today, workdaysFor, type CrewLink } from './mock';
import { initialRead, notificationsFor, type AppNotification, type NotifKind } from './mock/notifications';
import { hoursOverview, todayPlan } from './lib/stats';
import { resetPrefs, usePrefs } from './components/settings/prefs';
import { clearScrollPositions, scrollAllToTop } from './lib/scroll';
import { addDays, addMonths, firstOfMonth } from './lib/dates';

export type TabName = 'dashboard' | 'calendar' | 'documents' | 'contacts' | 'settings';

export type Route = { name: TabName } | { name: 'ticket' } | { name: 'pdf'; file: string };

/** Things that open in a bottom sheet over the current tab. `id` picks the note, contact, project... */
export type SheetKind = 'note' | 'hours' | 'info' | 'project' | 'contact' | 'notifications';
export interface SheetState {
  kind: SheetKind;
  id?: string;
  /** The sheet this one was opened from; closing or going Back returns to it instead of leaving the page. */
  from?: SheetState;
}

interface Entry {
  route: Route;
  /** True when this entry has its own browser-history entry, so Back can use history.back(). */
  pushed: boolean;
  /** Sheet that was open when this screen was pushed from it; Back brings it back. */
  reopen?: SheetState;
  /** Whether that sheet had its own browser-history entry. */
  reopenPushed?: boolean;
}

const TABS: readonly string[] = ['dashboard', 'calendar', 'documents', 'contacts', 'settings'];
export const isTab = (r: Route): r is { name: TabName } => TABS.includes(r.name);

export function routeToHash(r: Route): string {
  switch (r.name) {
    case 'pdf':
      return `#/pdf/${encodeURIComponent(r.file)}`;
    default:
      return `#/${r.name}`;
  }
}

/** decodeURIComponent throws on a stray "%"; a bad link should land on the dashboard, not crash. */
function safeDecode(v: string): string | null {
  try {
    return decodeURIComponent(v);
  } catch {
    return null;
  }
}

/** The route name is case-insensitive and a trailing slash is fine (#/Calendar/); the argument (a note id, a file name) is kept as written. */
const parseHash = (hash: string) => {
  const m = hash.replace(/^#\/?/, '').match(/^([a-z]+)(?:[/-](.*))?$/i);
  return { head: m?.[1].toLowerCase(), arg: m?.[2]?.replace(/\/$/, '') || undefined };
};

/** Rewrite an old or loose hash (#home, #stats, #ticket...) to its canonical form, so the address bar matches the screen. */
export function normalizeLocation() {
  if (typeof location === 'undefined' || hashToSheet(location.hash)) return;
  const canon = routeToHash(hashToRoute(location.hash));
  if (location.hash !== canon) history.replaceState(history.state, '', canon);
}

/** Accepts "#/pdf/x.pdf" and the bare-token form "#ticket" (for hosts that only pass plain anchors). Old #home and #stats land on the dashboard. */
export function hashToRoute(hash: string): Route {
  const { head, arg } = parseHash(hash);
  if (head === 'calendar' || head === 'documents' || head === 'contacts' || head === 'settings') return { name: head };
  if (head === 'ticket') return { name: 'ticket' };
  if (head === 'pdf' && arg) {
    const file = safeDecode(arg);
    if (file !== null && Object.hasOwn(pdfs, file)) return { name: 'pdf', file };
  }
  return { name: 'dashboard' };
}

/** "#/note/fl" (or "#note-fl") is a deep link to a note: the dashboard with that note's sheet open. */
export function hashToSheet(hash: string): SheetState | null {
  const { head, arg } = parseHash(hash);
  return head === 'note' && arg && noteById(arg) ? { kind: 'note', id: arg } : null;
}

const sameRoute = (a: Route | undefined, b: Route | undefined) => !!a && !!b && routeToHash(a) === routeToHash(b);

/** The screen and sheet a deep link should go back to when the app was opened on it. */
function fallbackFor(r: Route): { route: Route; reopen?: SheetState } {
  if (r.name === 'ticket') return { route: { name: 'dashboard' }, reopen: { kind: 'note', id: 'fl' } };
  if (r.name === 'pdf') return { route: { name: 'dashboard' }, reopen: { kind: 'note', id: r.file === 'Ticket_OS487.pdf' ? 'fl' : 're' } };
  return { route: { name: 'dashboard' } };
}

function initialStack(): Entry[] {
  const r = hashToRoute(typeof location === 'undefined' ? '' : location.hash);
  if (isTab(r)) return [{ route: r, pushed: false }];
  const prev = fallbackFor(r);
  return [{ route: prev.route, pushed: false }, { route: r, pushed: false, reopen: prev.reopen }];
}

const initialSheet = (): SheetState | null => hashToSheet(typeof location === 'undefined' ? '' : location.hash);

export type FontTheme = 'inter' | 'screenplay' | 'poster' | 'editorial' | 'credits';

/** Headline and numeral typefaces to try out; body text stays Inter. Settings and the demo panel list these. */
export const FONT_THEMES: { value: FontTheme; label: string; hint: string; sample: string }[] = [
  { value: 'inter', label: 'Inter', hint: 'Clean and neutral', sample: '08:40' },
  { value: 'screenplay', label: 'Screenplay', hint: 'Courier Prime, script page', sample: '08:40' },
  { value: 'poster', label: 'Poster', hint: 'Bebas Neue, tall capitals', sample: '08:40' },
  { value: 'editorial', label: 'Editorial', hint: 'Fraunces, a warm serif', sample: '08:40' },
  { value: 'credits', label: 'Credits', hint: 'Syne, wide and rebellious', sample: '08:40' },
];

const FONT_KEY = 'crewser-font-theme';

function loadFontTheme(): FontTheme {
  try {
    const v = localStorage.getItem(FONT_KEY);
    if (FONT_THEMES.some((f) => f.value === v)) return v as FontTheme;
  } catch {
    // Storage can be blocked (private mode); fall back to the default.
  }
  return 'inter';
}

export type ExpandList = 'dashboard' | 'calendar';

/** Brand accent on smart notes, switchable from the demo panel while we try them out. */
export type NoteAccent = 'stub' | 'corner' | 'band' | 'edge' | 'none';

interface Toast {
  id: number;
  message: string;
}

interface DemoState {
  stack: Entry[];
  offline: boolean;
  empty: boolean;
  codeFound: boolean;
  logOpen: boolean;
  /** The bottom sheet over the current tab, if any (the Log sheet has its own flag). */
  sheet: SheetState | null;
  /** Crew links on this phone, and the one the app is currently showing. */
  links: CrewLink[];
  activeLinkId: string;
  /** Master data (personal and payroll details) filled in. */
  masterDataDone: boolean;
  fontTheme: FontTheme;
  breakMin: number;
  /** Times entered in the Log sheet, "HH:MM". End stays empty until wrap. */
  logStart: string;
  logEnd: string | null;
  homeAllOpen: boolean;
  expanded: Record<ExpandList, string | null>;
  /** Selected day in the calendar (ISO). The week strip shows its week. */
  calDate: string;
  /** First day of the month shown when the month view is open (ISO). */
  calMonth: string;
  calMonthOpen: boolean;
  /** How the last navigation moved, for the screen transition. */
  navDir: NavDir;
  splash: boolean;
  /** Days submitted from this prototype (draft → submitted), per crew link. Read it with useSubmitted(). */
  submitted: Record<string, string[]>;
  /** Half-typed Log forms of the other links, so A → B → A keeps A's start, end and break. */
  logs: Record<string, LogForm>;
  /** The open sheet has its own browser-history entry, so Back closes it. */
  sheetPushed: boolean;
  /** The light sheet has scrolled under the status bar: show dark status bar text. */
  statusDark: boolean;
  toast: Toast | null;
  noteAccent: NoteAccent;
  /** Ids of the notifications already read, per crew link. Read it with useNotifications(). */
  notifRead: Record<string, string[]>;
}

interface Actions {
  navigate: (r: Route) => void;
  back: () => void;
  /** `src` matters for a sheet's own history entry: only popstate closes it, so a hashchange fired by the same step cannot undo a reopen. */
  syncFromLocation: (src?: 'popstate' | 'hashchange') => void;
  setFlag: (k: 'offline' | 'empty' | 'codeFound', v: boolean) => void;
  setLogOpen: (v: boolean) => void;
  /** `from` is the sheet to come back to when this one is closed (see SheetState.from). */
  openSheet: (kind: SheetKind, id?: string, from?: SheetState) => void;
  closeSheet: () => void;
  /** Switch to another crew link. Returns false when refused (unknown, expired or revoked link, with a toast for the last two); true when the link is now active. */
  setActiveLink: (id: string) => boolean;
  completeMasterData: () => void;
  setFontTheme: (t: FontTheme) => void;
  setBreak: (min: number) => void;
  setLogTime: (k: 'logStart' | 'logEnd', v: string | null) => void;
  toggleHomeAll: () => void;
  toggleExpanded: (list: ExpandList, id: string) => void;
  /** Prev/next: a week in the week strip, a month in the month view. */
  shiftCal: (delta: number) => void;
  setCalDate: (iso: string) => void;
  toggleCalMonth: () => void;
  hideSplash: () => void;
  submitDay: (iso: string) => void;
  setStatusDark: (v: boolean) => void;
  showToast: (message: string) => void;
  setNoteAccent: (a: NoteAccent) => void;
  /** Notification actions work on the active link's notifications. */
  markRead: (id: string) => void;
  markAllRead: () => void;
  /** Mark one read and go where it points: a PDF, or a sheet. */
  openNotification: (id: string) => void;
  reset: () => void;
}

export type NavDir = 'push' | 'pop' | 'tab' | 'none';

/** The Log sheet's form. The active link's form lives in the top-level fields; the others wait in `logs`. */
interface LogForm {
  breakMin: number;
  logStart: string;
  logEnd: string | null;
}

/** Log sheet defaults for a crew link: today's call time, the usual break, wrap still open. */
const logDefaults = (): LogForm => ({
  breakMin: today.defaultBreakMin,
  logStart: todayPlan().call,
  logEnd: null,
});

/** Editing start, end or break after submitting un-sends the day (for the active link): it has to be sent again. Null when nothing was sent. */
const unsentToday = (s: DemoState): Pick<DemoState, 'submitted'> | null => {
  const sent = s.submitted[s.activeLinkId] ?? [];
  if (!sent.includes(today.date)) return null;
  return { submitted: { ...s.submitted, [s.activeLinkId]: sent.filter((d) => d !== today.date) } };
};

const UNSENT_TOAST = 'Hours changed · send again';

const initialState = (): DemoState => ({
  stack: initialStack(),
  offline: false,
  empty: false,
  codeFound: true,
  logOpen: false,
  sheet: initialSheet(),
  links,
  activeLinkId: links.find((l) => l.isMe && l.status === 'active')!.id,
  masterDataDone: false,
  fontTheme: loadFontTheme(),
  ...logDefaults(),
  homeAllOpen: false,
  expanded: { dashboard: null, calendar: null },
  calDate: today.date,
  calMonth: firstOfMonth(today.date),
  calMonthOpen: false,
  navDir: 'none',
  splash: true,
  submitted: {},
  logs: {},
  sheetPushed: false,
  statusDark: false,
  toast: null,
  noteAccent: 'stub',
  notifRead: initialRead(),
});

let toastSeq = 0;

/**
 * Close the open sheet without going through Back. If it owns a history entry, step back over it
 * so Back does not later land on a sheet that is gone.
 */
function dropSheet(pushed: boolean) {
  if (pushed) history.back();
}

export const useDemo = create<DemoState & Actions>()((set, get) => ({
  ...initialState(),

  navigate: (r) => {
    const { stack, sheet, sheetPushed } = get();
    if (sameRoute(stack[stack.length - 1]?.route, r)) return;
    // Leaving a sheet's tab for another tab: take over the sheet's history entry instead of adding a dead one.
    if (isTab(r) && sheetPushed) history.replaceState(null, '', routeToHash(r));
    else history.pushState(null, '', routeToHash(r));
    set({
      stack: isTab(r)
        ? [{ route: r, pushed: true }]
        : [...stack, { route: r, pushed: true, reopen: sheet ?? undefined, reopenPushed: sheet ? sheetPushed : undefined }],
      navDir: isTab(r) ? 'tab' : 'push',
      logOpen: false,
      sheet: null,
      sheetPushed: false,
    });
  },

  back: () => {
    const { stack } = get();
    const top = stack[stack.length - 1];
    if (stack.length < 2) {
      history.replaceState(null, '', routeToHash({ name: 'dashboard' }));
      set({ stack: [{ route: { name: 'dashboard' }, pushed: false }], navDir: 'pop' });
      return;
    }
    if (top.pushed) {
      history.back(); // popstate → syncFromLocation pops the stack
      return;
    }
    const next = stack.slice(0, -1);
    history.replaceState(null, '', routeToHash(next[next.length - 1].route));
    set({ stack: next, navDir: 'pop', sheet: top.reopen ?? null, sheetPushed: top.reopenPushed ?? false });
  },

  syncFromLocation: (src) => {
    const r = hashToRoute(location.hash);
    const deepSheet = hashToSheet(location.hash);
    const { stack, sheet, sheetPushed } = get();
    // Back with a sheet open that owns a history entry: close the sheet, stay on the page.
    if (sheet && sheetPushed && src !== 'hashchange') {
      if (sheet.from) {
        // Back from a sheet that was opened from another: show that one, with a fresh history entry for it.
        history.pushState(null, '', location.hash);
        set({ sheet: sheet.from });
        return;
      }
      set({ sheet: null, sheetPushed: false });
      return;
    }
    const top = stack[stack.length - 1];
    if (!deepSheet) normalizeLocation();
    if (deepSheet) {
      set({ stack: isTab(top.route) ? stack : [{ route: r, pushed: false }], navDir: 'none', sheet: deepSheet, logOpen: false });
      return;
    }
    if (sameRoute(top?.route, r)) return;
    if (sameRoute(stack[stack.length - 2]?.route, r)) {
      set({ stack: stack.slice(0, -1), navDir: 'pop', sheet: top.reopen ?? null, sheetPushed: top.reopenPushed ?? false, logOpen: false });
    } else if (isTab(r)) {
      set({ stack: [{ route: r, pushed: false }], navDir: 'tab', sheet: null, sheetPushed: false, logOpen: false });
    } else {
      set({ stack: [...stack, { route: r, pushed: false }], navDir: 'push', sheet: null, sheetPushed: false, logOpen: false });
    }
  },

  setFlag: (k, v) => {
    set({ [k]: v } as Pick<DemoState, typeof k>);
    scrollAllToTop(); // so the state you just switched on is in view
  },
  setLogOpen: (v) => {
    if (!v) return set({ logOpen: false });
    dropSheet(get().sheetPushed);
    set({ logOpen: true, sheet: null, sheetPushed: false });
  },
  openSheet: (kind, id, from) => {
    const { sheet, sheetPushed } = get();
    // A sheet gets one history entry; switching to another sheet reuses it.
    if (!sheet && !sheetPushed) history.pushState(null, '', location.hash || routeToHash(get().stack[get().stack.length - 1].route));
    set({ sheet: { kind, id, from }, sheetPushed: sheet ? sheetPushed : true, logOpen: false });
  },
  closeSheet: () => {
    const { sheet, sheetPushed } = get();
    if (!sheet) return;
    if (sheet.from) {
      set({ sheet: sheet.from }); // keeps the history entry: it now belongs to the sheet we return to
      return;
    }
    if (sheetPushed) {
      history.back(); // popstate → syncFromLocation closes the sheet
      return;
    }
    // A deep link (#/note/fl) leaves its hash behind; drop it so reload doesn't reopen the sheet.
    if (hashToSheet(location.hash)) history.replaceState(null, '', routeToHash(get().stack[get().stack.length - 1].route));
    set({ sheet: null });
  },
  setActiveLink: (id) => {
    const link = linkById(id);
    if (!link) return false;
    if (link.status === 'revoked') {
      get().showToast(`Production removed this access to ${link.projectName}. Ask them for a new link.`);
      return false;
    }
    if (link.status === 'expired') {
      get().showToast(`The link for ${link.projectName} has expired. Ask production for a new one.`);
      return false;
    }
    if (id === get().activeLinkId) return true;
    // Close what is open and swap the Log form: park this link's, bring back the other's (or defaults).
    dropSheet(get().sheetPushed);
    set((s) => {
      const parked = { ...s.logs, [s.activeLinkId]: { breakMin: s.breakMin, logStart: s.logStart, logEnd: s.logEnd } };
      const { [id]: next = logDefaults(), ...rest } = parked;
      return { activeLinkId: id, sheet: null, sheetPushed: false, logOpen: false, logs: rest, ...next };
    });
    return true;
  },
  completeMasterData: () => set({ masterDataDone: true }),
  setFontTheme: (t) => {
    try {
      localStorage.setItem(FONT_KEY, t);
    } catch {
      // Not persisted; the choice still applies for this visit.
    }
    set({ fontTheme: t });
  },
  setBreak: (min) => {
    const s = get();
    const breakMin = Math.max(0, Math.min(120, min));
    if (breakMin === s.breakMin) return;
    const unsent = unsentToday(s);
    set({ breakMin, ...unsent });
    if (unsent) get().showToast(UNSENT_TOAST);
  },
  setLogTime: (k, v) => {
    const s = get();
    if (v === s[k]) return;
    const unsent = unsentToday(s);
    set({ ...({ [k]: v } as Pick<DemoState, 'logStart' | 'logEnd'>), ...unsent });
    if (unsent) get().showToast(UNSENT_TOAST);
  },
  toggleHomeAll: () => set((s) => ({ homeAllOpen: !s.homeAllOpen })),
  toggleExpanded: (list, id) => set((s) => ({ expanded: { ...s.expanded, [list]: s.expanded[list] === id ? null : id } })),
  shiftCal: (delta) =>
    set((s) =>
      s.calMonthOpen
        ? { calMonth: addMonths(s.calMonth, delta) }
        : { calDate: addDays(s.calDate, delta * 7), expanded: { ...s.expanded, calendar: null } },
    ),
  setCalDate: (iso) => set((s) => ({ calDate: iso, calMonth: firstOfMonth(iso), calMonthOpen: false, expanded: { ...s.expanded, calendar: null } })),
  toggleCalMonth: () => set((s) => ({ calMonthOpen: !s.calMonthOpen, calMonth: firstOfMonth(s.calDate) })),
  hideSplash: () => set({ splash: false }),
  submitDay: (iso) =>
    set((s) => {
      const days = s.submitted[s.activeLinkId] ?? [];
      return days.includes(iso) ? {} : { submitted: { ...s.submitted, [s.activeLinkId]: [...days, iso] } };
    }),
  setStatusDark: (v) => set({ statusDark: v }),
  showToast: (message) => set({ toast: { id: ++toastSeq, message } }),
  setNoteAccent: (a) => set({ noteAccent: a }),
  markRead: (id) =>
    set((s) => {
      const read = s.notifRead[s.activeLinkId] ?? [];
      return read.includes(id) ? {} : { notifRead: { ...s.notifRead, [s.activeLinkId]: [...read, id] } };
    }),
  markAllRead: () =>
    set((s) => {
      // Only what the list shows: a kind switched off in Settings stays unread for when it comes back.
      const shown = visibleNotifications(s.activeLinkId, s.submitted[s.activeLinkId] ?? NO_DAYS, usePrefs.getState()).map((n) => n.id);
      const read = s.notifRead[s.activeLinkId] ?? [];
      return { notifRead: { ...s.notifRead, [s.activeLinkId]: [...read, ...shown.filter((id) => !read.includes(id))] } };
    }),
  openNotification: (id) => {
    const n = notificationsFor(get().activeLinkId).find((x) => x.id === id);
    if (!n) return;
    get().markRead(id);
    // Both ways keep the notifications sheet to come back to: the PDF screen reopens it on Back, a sheet returns to it on close or Back.
    if ('pdf' in n.target) get().navigate({ name: 'pdf', file: n.target.pdf });
    else get().openSheet(n.target.sheet, n.target.id, get().sheet ?? undefined);
  },

  reset: () => {
    clearScrollPositions();
    history.replaceState(null, '', routeToHash({ name: 'dashboard' }));
    resetPrefs();
    const { noteAccent, fontTheme } = get();
    set({ ...initialState(), stack: [{ route: { name: 'dashboard' }, pushed: false }], sheet: null, navDir: 'tab', splash: false, noteAccent, fontTheme });
  },
}));

export const useRoute = () => useDemo((s) => s.stack[s.stack.length - 1].route);

/** The crew link the app is showing right now. */
export const useActiveLink = () => useDemo((s) => s.links.find((l) => l.id === s.activeLinkId)!);

/** The Settings switch that turns a kind of notification off. Kinds not listed are always shown. */
const KIND_PREF: Partial<Record<NotifKind, 'callSheetOut' | 'hoursReminder'>> = { callsheet: 'callSheetOut', hours: 'hoursReminder' };

const NO_DAYS: string[] = [];

/** A link's notifications that are still relevant: Settings allows the kind, and an hours one only while its day is unsent. */
function visibleNotifications(linkId: string, submitted: string[], prefs: { callSheetOut: boolean; hoursReminder: boolean }): AppNotification[] {
  const unsent = hoursOverview(submitted, null, workdaysFor(linkId)).unsent.map((d) => d.date);
  return notificationsFor(linkId).filter((n) => {
    const key = KIND_PREF[n.kind];
    if (key && !prefs[key]) return false;
    return n.kind !== 'hours' || !n.day || unsent.includes(n.day);
  });
}

export type NotificationItem = AppNotification & { unread: boolean };

/** The active link's notifications to show, unread first, newest first within each group. */
export function useNotifications(): NotificationItem[] {
  const linkId = useDemo((s) => s.activeLinkId);
  const read = useDemo((s) => s.notifRead[s.activeLinkId]);
  const submitted = useDemo((s) => s.submitted[s.activeLinkId] ?? NO_DAYS);
  const callSheetOut = usePrefs((p) => p.callSheetOut);
  const hoursReminder = usePrefs((p) => p.hoursReminder);
  return useMemo(
    () =>
      visibleNotifications(linkId, submitted, { callSheetOut, hoursReminder })
        .map((n) => ({ ...n, unread: !read?.includes(n.id) }))
        .sort((a, b) => Number(b.unread) - Number(a.unread) || Date.parse(b.at) - Date.parse(a.at)),
    [linkId, read, submitted, callSheetOut, hoursReminder],
  );
}

/** Unread notifications of the active link, for the bell's badge. */
export const useUnreadCount = () => useNotifications().filter((n) => n.unread).length;
