import { create } from 'zustand';
import { noteById, pdfs, today } from './mock';
import { computeStats, CURRENT_WEEK, FIRST_WEEK, LAST_WEEK, todayPlan, weekStats, type Period } from './lib/stats';
import { clearScrollPositions, scrollAllToTop } from './lib/scroll';
import { addDays, addMonths, firstOfMonth } from './lib/dates';

export type TabName = 'home' | 'calendar' | 'stats';

export type Route =
  | { name: TabName }
  | { name: 'note'; id: string }
  | { name: 'ticket' }
  | { name: 'pdf'; file: string };

interface Entry {
  route: Route;
  /** True when this entry has its own browser-history entry, so Back can use history.back(). */
  pushed: boolean;
}

export const isTab = (r: Route): r is { name: TabName } => r.name === 'home' || r.name === 'calendar' || r.name === 'stats';

export function routeToHash(r: Route): string {
  switch (r.name) {
    case 'note':
      return `#/note/${r.id}`;
    case 'pdf':
      return `#/pdf/${encodeURIComponent(r.file)}`;
    default:
      return `#/${r.name}`;
  }
}

/** Accepts "#/note/fl" and the bare-token form "#note-fl" (for hosts that only pass plain anchors). */
export function hashToRoute(hash: string): Route {
  const m = hash.replace(/^#\/?/, '').match(/^([a-z]+)(?:[/-](.+))?$/);
  const head = m?.[1];
  const arg = m?.[2]?.replace(/\/$/, '');
  if (head === 'calendar' || head === 'stats' || head === 'home') return { name: head };
  if (head === 'note' && arg && noteById(arg)) return { name: 'note', id: arg };
  if (head === 'ticket') return { name: 'ticket' };
  if (head === 'pdf' && arg) {
    const file = decodeURIComponent(arg);
    if (pdfs[file]) return { name: 'pdf', file };
  }
  return { name: 'home' };
}

const sameRoute = (a: Route | undefined, b: Route | undefined) => !!a && !!b && routeToHash(a) === routeToHash(b);

/** What a deep link should go back to when the app was opened on it. */
function fallbackFor(r: Route): Route {
  if (r.name === 'ticket') return { name: 'note', id: 'fl' };
  if (r.name === 'pdf') return r.file === 'Ticket_OS487.pdf' ? { name: 'note', id: 'fl' } : { name: 'note', id: 're' };
  return { name: 'home' };
}

function initialStack(): Entry[] {
  const r = hashToRoute(typeof location === 'undefined' ? '' : location.hash);
  if (isTab(r)) return [{ route: r, pushed: false }];
  const prev = fallbackFor(r);
  const base: Entry[] = isTab(prev) ? [] : [{ route: { name: 'home' }, pushed: false }];
  return [...base, { route: prev, pushed: false }, { route: r, pushed: false }];
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
export type StatSheetKind = 'overtime' | 'average' | 'night' | 'rest' | 'approvals' | 'pay';

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
    const { stack } = get();
    if (sameRoute(stack[stack.length - 1]?.route, r)) return;
    history.pushState(null, '', routeToHash(r));
    set({
      stack: isTab(r) ? [{ route: r, pushed: true }] : [...stack, { route: r, pushed: true }],
      navDir: isTab(r) ? 'tab' : 'push',
      logOpen: false,
      statsSheet: null,
    });
  },

  back: () => {
    const { stack } = get();
    const top = stack[stack.length - 1];
    if (stack.length < 2) {
      history.replaceState(null, '', routeToHash({ name: 'home' }));
      set({ stack: [{ route: { name: 'home' }, pushed: false }], navDir: 'pop' });
      return;
    }
    if (top.pushed) {
      history.back(); // popstate → syncFromLocation pops the stack
      return;
    }
    const next = stack.slice(0, -1);
    history.replaceState(null, '', routeToHash(next[next.length - 1].route));
    set({ stack: next, navDir: 'pop' });
  },

  syncFromLocation: () => {
    const r = hashToRoute(location.hash);
    const { stack } = get();
    if (sameRoute(stack[stack.length - 1]?.route, r)) return;
    if (sameRoute(stack[stack.length - 2]?.route, r)) {
      set({ stack: stack.slice(0, -1), navDir: 'pop' });
    } else if (isTab(r)) {
      set({ stack: [{ route: r, pushed: false }], navDir: 'tab' });
    } else {
      set({ stack: [...stack, { route: r, pushed: false }], navDir: 'push' });
    }
    set({ logOpen: false });
  },

  setFlag: (k, v) => {
    set({ [k]: v } as Pick<DemoState, typeof k>);
    scrollAllToTop(); // so the state you just switched on is in view
  },
  setLogOpen: (v) => set({ logOpen: v }),
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
    history.replaceState(null, '', routeToHash({ name: 'home' }));
    set({ ...initialState(), stack: [{ route: { name: 'home' }, pushed: false }], navDir: 'tab', splash: false, noteAccent: get().noteAccent });
  },
}));

export const useRoute = () => useDemo((s) => s.stack[s.stack.length - 1].route);
export const usePrevRoute = () => useDemo((s) => s.stack[s.stack.length - 2]?.route);
