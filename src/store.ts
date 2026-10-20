import { create } from 'zustand';
import { noteById, pdfs, today } from './mock';
import { weekStats } from './lib/stats';
import { clearScrollPositions, scrollAllToTop } from './lib/scroll';

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

export function hashToRoute(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  const [head, arg] = parts;
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
  homeAllOpen: boolean;
  expanded: Record<ExpandList, string | null>;
  calWeekOffset: number;
  /** 0 = Monday … 6 = Sunday within the shown week */
  calDayIndex: number;
  statsBar: number;
  /** The light sheet has scrolled under the status bar: show dark status bar text. */
  statusDark: boolean;
  toast: Toast | null;
}

interface Actions {
  navigate: (r: Route) => void;
  back: () => void;
  syncFromLocation: () => void;
  setFlag: (k: 'offline' | 'empty' | 'codeFound', v: boolean) => void;
  setLogOpen: (v: boolean) => void;
  setBreak: (min: number) => void;
  toggleHomeAll: () => void;
  toggleExpanded: (list: ExpandList, id: string) => void;
  shiftWeek: (delta: number) => void;
  setCalDay: (i: number) => void;
  setStatsBar: (i: number) => void;
  setStatusDark: (v: boolean) => void;
  showToast: (message: string) => void;
  reset: () => void;
}

const todayIndex = (new Date(today.date + 'T00:00:00Z').getUTCDay() + 6) % 7;

const initialState = (): DemoState => ({
  stack: initialStack(),
  offline: false,
  empty: false,
  codeFound: true,
  logOpen: false,
  breakMin: today.defaultBreakMin,
  homeAllOpen: false,
  expanded: { home: null, calendar: null },
  calWeekOffset: 0,
  calDayIndex: todayIndex,
  statsBar: weekStats.longestIndex,
  statusDark: false,
  toast: null,
});

let toastSeq = 0;

export const useDemo = create<DemoState & Actions>()((set, get) => ({
  ...initialState(),

  navigate: (r) => {
    const { stack } = get();
    if (sameRoute(stack[stack.length - 1]?.route, r)) return;
    history.pushState(null, '', routeToHash(r));
    set({ stack: isTab(r) ? [{ route: r, pushed: true }] : [...stack, { route: r, pushed: true }], logOpen: false });
  },

  back: () => {
    const { stack } = get();
    const top = stack[stack.length - 1];
    if (stack.length < 2) {
      history.replaceState(null, '', routeToHash({ name: 'home' }));
      set({ stack: [{ route: { name: 'home' }, pushed: false }] });
      return;
    }
    if (top.pushed) {
      history.back(); // popstate → syncFromLocation pops the stack
      return;
    }
    const next = stack.slice(0, -1);
    history.replaceState(null, '', routeToHash(next[next.length - 1].route));
    set({ stack: next });
  },

  syncFromLocation: () => {
    const r = hashToRoute(location.hash);
    const { stack } = get();
    if (sameRoute(stack[stack.length - 1]?.route, r)) return;
    if (sameRoute(stack[stack.length - 2]?.route, r)) {
      set({ stack: stack.slice(0, -1) });
    } else if (isTab(r)) {
      set({ stack: [{ route: r, pushed: false }] });
    } else {
      set({ stack: [...stack, { route: r, pushed: false }] });
    }
    set({ logOpen: false });
  },

  setFlag: (k, v) => {
    set({ [k]: v } as Pick<DemoState, typeof k>);
    scrollAllToTop(); // so the state you just switched on is in view
  },
  setLogOpen: (v) => set({ logOpen: v }),
  setBreak: (min) => set({ breakMin: Math.max(0, Math.min(120, min)) }),
  toggleHomeAll: () => set((s) => ({ homeAllOpen: !s.homeAllOpen })),
  toggleExpanded: (list, id) => set((s) => ({ expanded: { ...s.expanded, [list]: s.expanded[list] === id ? null : id } })),
  shiftWeek: (delta) => set((s) => ({ calWeekOffset: s.calWeekOffset + delta, expanded: { ...s.expanded, calendar: null } })),
  setCalDay: (i) => set((s) => ({ calDayIndex: i, expanded: { ...s.expanded, calendar: null } })),
  setStatsBar: (i) => set({ statsBar: i }),
  setStatusDark: (v) => set({ statusDark: v }),
  showToast: (message) => set({ toast: { id: ++toastSeq, message } }),

  reset: () => {
    clearScrollPositions();
    history.replaceState(null, '', routeToHash({ name: 'home' }));
    set({ ...initialState(), stack: [{ route: { name: 'home' }, pushed: false }] });
  },
}));

export const useRoute = () => useDemo((s) => s.stack[s.stack.length - 1].route);
export const usePrevRoute = () => useDemo((s) => s.stack[s.stack.length - 2]?.route);
