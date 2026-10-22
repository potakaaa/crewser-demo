import { create } from 'zustand';
import { linkById, links, noteById, pdfs, today, type CrewLink } from './mock';
import { computeStats, CURRENT_WEEK, FIRST_WEEK, LAST_WEEK, todayPlan, weekStats, type Period } from './lib/stats';
import { clearScrollPositions, scrollAllToTop } from './lib/scroll';
import { addDays, addMonths, firstOfMonth } from './lib/dates';

export type TabName = 'dashboard' | 'calendar' | 'documents' | 'contacts' | 'settings';

export type Route = { name: TabName } | { name: 'ticket' } | { name: 'pdf'; file: string };

/** Things that open in a bottom sheet over the current tab. `id` picks the note, contact, project... */
export type SheetKind = 'note' | 'hours' | 'info' | 'project' | 'contact';
export interface SheetState {
  kind: SheetKind;
  id?: string;
}

interface Entry {
  route: Route;
  /** True when this entry has its own browser-history entry, so Back can use history.back(). */
  pushed: boolean;
  /** Sheet that was open when this screen was pushed from it; Back brings it back. */
  reopen?: SheetState;
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

const parseHash = (hash: string) => {
  const m = hash.replace(/^#\/?/, '').match(/^([a-z]+)(?:[/-](.+))?$/);
  return { head: m?.[1], arg: m?.[2]?.replace(/\/$/, '') };
};

/** Accepts "#/pdf/x.pdf" and the bare-token form "#ticket" (for hosts that only pass plain anchors). Old #home and #stats land on the dashboard. */
export function hashToRoute(hash: string): Route {
  const { head, arg } = parseHash(hash);
  if (head === 'calendar' || head === 'documents' || head === 'contacts' || head === 'settings') return { name: head };
  if (head === 'ticket') return { name: 'ticket' };
  if (head === 'pdf' && arg) {
    const file = decodeURIComponent(arg);
    if (pdfs[file]) return { name: 'pdf', file };
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
  { value: 'inter', label: 'Inter', hint: 'Clean and neutral, the current look', sample: '08:40' },
  { value: 'screenplay', label: 'Screenplay', hint: 'Courier Prime, like a script page', sample: '08:40' },
  { value: 'poster', label: 'Poster', hint: 'Bebas Neue, tall film-poster capitals', sample: '08:40' },
  { value: 'editorial', label: 'Editorial', hint: 'Fraunces, a warm magazine serif', sample: '08:40' },
  { value: 'credits', label: 'Credits', hint: 'Syne, wide and a bit rebellious', sample: '08:40' },
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

export type ExpandList = 'home' | 'calendar';

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
  statsPeriod: 'week' | 'project';
  /** Monday of the week shown in the week view (ISO). */
  statsWeek: string;
  /** Selected bar / day (ISO). */
  statsDay: string;
  /** Legacy, goes away with StatsScreen. */
  statsSheet: StatSheetKind | null;
  /** Days submitted from this prototype (draft → submitted). */
  submitted: string[];
  /** The light sheet has scrolled under the status bar: show dark status bar text. */
  statusDark: boolean;
  toast: Toast | null;
  noteAccent: NoteAccent;
}

interface Actions {
  navigate: (r: Route) => void;
  back: () => void;
  syncFromLocation: () => void;
  setFlag: (k: 'offline' | 'empty' | 'codeFound', v: boolean) => void;
  setLogOpen: (v: boolean) => void;
  openSheet: (kind: SheetKind, id?: string) => void;
  closeSheet: () => void;
  /** Switch to another crew link; expired links are refused with a toast. */
  setActiveLink: (id: string) => void;
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
  setStatsPeriod: (p: 'week' | 'project') => void;
  shiftStatsWeek: (delta: number) => void;
  setStatsDay: (iso: string) => void;
  openStatsSheet: (k: StatSheetKind | null) => void;
  submitDay: (iso: string) => void;
  setStatusDark: (v: boolean) => void;
  showToast: (message: string) => void;
  setNoteAccent: (a: NoteAccent) => void;
  reset: () => void;
}

export type NavDir = 'push' | 'pop' | 'tab' | 'none';
/** Legacy, goes away with StatsScreen. */
export type StatSheetKind = 'overtime' | 'average' | 'night' | 'rest' | 'approvals';

const longestIn = (period: Period, submitted: string[]) => {
  const s = computeStats(period, submitted);
  return (s.hasData ? s.longest : s.days[0]).date;
};

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
  breakMin: today.defaultBreakMin,
  logStart: todayPlan(today.defaultBreakMin).call,
  logEnd: null,
  homeAllOpen: false,
  expanded: { home: null, calendar: null },
  calDate: today.date,
  calMonth: firstOfMonth(today.date),
  calMonthOpen: false,
  navDir: 'none',
  splash: true,
  statsPeriod: 'week',
  statsWeek: LAST_WEEK,
  statsDay: weekStats.longest.date,
  statsSheet: null,
  submitted: [],
  statusDark: false,
  toast: null,
  noteAccent: 'stub',
});

let toastSeq = 0;

export const useDemo = create<DemoState & Actions>()((set, get) => ({
  ...initialState(),

  navigate: (r) => {
    const { stack, sheet } = get();
    if (sameRoute(stack[stack.length - 1]?.route, r)) return;
    history.pushState(null, '', routeToHash(r));
    set({
      stack: isTab(r) ? [{ route: r, pushed: true }] : [...stack, { route: r, pushed: true, reopen: sheet ?? undefined }],
      navDir: isTab(r) ? 'tab' : 'push',
      logOpen: false,
      sheet: null,
      statsSheet: null,
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
    set({ stack: next, navDir: 'pop', sheet: top.reopen ?? null });
  },

  syncFromLocation: () => {
    const r = hashToRoute(location.hash);
    const deepSheet = hashToSheet(location.hash);
    const { stack } = get();
    const top = stack[stack.length - 1];
    if (deepSheet) {
      set({ stack: isTab(top.route) ? stack : [{ route: r, pushed: false }], navDir: 'none', sheet: deepSheet, logOpen: false });
      return;
    }
    if (sameRoute(top?.route, r)) return;
    if (sameRoute(stack[stack.length - 2]?.route, r)) {
      set({ stack: stack.slice(0, -1), navDir: 'pop', sheet: top.reopen ?? null, logOpen: false });
    } else if (isTab(r)) {
      set({ stack: [{ route: r, pushed: false }], navDir: 'tab', sheet: null, logOpen: false });
    } else {
      set({ stack: [...stack, { route: r, pushed: false }], navDir: 'push', sheet: null, logOpen: false });
    }
  },

  setFlag: (k, v) => {
    set({ [k]: v } as Pick<DemoState, typeof k>);
    scrollAllToTop(); // so the state you just switched on is in view
  },
  setLogOpen: (v) => set(v ? { logOpen: true, sheet: null } : { logOpen: false }),
  openSheet: (kind, id) => set({ sheet: { kind, id }, logOpen: false }),
  closeSheet: () => {
    // A deep link (#/note/fl) leaves its hash behind; drop it so reload doesn't reopen the sheet.
    if (hashToSheet(location.hash)) history.replaceState(null, '', routeToHash(get().stack[get().stack.length - 1].route));
    set({ sheet: null });
  },
  setActiveLink: (id) => {
    const link = linkById(id);
    if (!link) return;
    if (link.status === 'expired') {
      get().showToast(`The link for ${link.projectName} has expired. Ask production for a new one.`);
      return;
    }
    set({ activeLinkId: id });
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
  setBreak: (min) => set({ breakMin: Math.max(0, Math.min(120, min)) }),
  setLogTime: (k, v) => set({ [k]: v } as Pick<DemoState, typeof k>),
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
  setStatsPeriod: (p) =>
    set((s) => ({
      statsPeriod: p,
      statsDay: longestIn(p === 'week' ? { kind: 'week', monday: s.statsWeek } : { kind: 'project' }, s.submitted),
    })),
  shiftStatsWeek: (delta) =>
    set((s) => {
      const next = addDays(s.statsWeek, delta * 7);
      if (next < FIRST_WEEK || next > CURRENT_WEEK) return {};
      return { statsWeek: next, statsDay: longestIn({ kind: 'week', monday: next }, s.submitted) };
    }),
  setStatsDay: (iso) => set({ statsDay: iso }),
  openStatsSheet: (k) => set({ statsSheet: k }),
  submitDay: (iso) => set((s) => ({ submitted: s.submitted.includes(iso) ? s.submitted : [...s.submitted, iso] })),
  setStatusDark: (v) => set({ statusDark: v }),
  showToast: (message) => set({ toast: { id: ++toastSeq, message } }),
  setNoteAccent: (a) => set({ noteAccent: a }),

  reset: () => {
    clearScrollPositions();
    history.replaceState(null, '', routeToHash({ name: 'dashboard' }));
    const { noteAccent, fontTheme } = get();
    set({ ...initialState(), stack: [{ route: { name: 'dashboard' }, pushed: false }], sheet: null, navDir: 'tab', splash: false, noteAccent, fontTheme });
  },
}));

export const useRoute = () => useDemo((s) => s.stack[s.stack.length - 1].route);
export const usePrevRoute = () => useDemo((s) => s.stack[s.stack.length - 2]?.route);

/** The crew link the app is showing right now. */
export const useActiveLink = () => useDemo((s) => s.links.find((l) => l.id === s.activeLinkId)!);
