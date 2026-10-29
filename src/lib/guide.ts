import type { TabName } from '../store';

/** Things the user does that a guide step can wait for. Components announce them with guideEmit; the guide listens. */
export type GuideEvent =
  | 'deck:swiped'
  | 'ruler:scrubbed'
  | 'switch:opened'
  | 'timer:started'
  | 'profile:opened';

export interface GuideStep {
  id: string;
  route: TabName;
  /** The element to spotlight: its data-guide attribute. */
  target: string;
  title: string;
  /** Two short lines at most. */
  body: string;
  /** The gesture that completes the step; null means the step only has Next. */
  waitFor: GuideEvent[] | null;
  placement: 'above' | 'below';
}

/** The first-visit tour, in order. */
export const GUIDE_STEPS: GuideStep[] = [
  { id: 'deck', route: 'dashboard', target: 'deck', title: "What's next", body: 'Swipe the card or tap the arrows to see what comes after.', waitFor: ['deck:swiped'], placement: 'below' },
  { id: 'ruler', route: 'dashboard', target: 'ruler', title: 'Look ahead', body: 'Drag the strip to scrub through the coming days.', waitFor: ['ruler:scrubbed'], placement: 'below' },
  { id: 'switch', route: 'dashboard', target: 'switch', title: 'Switch', body: 'Tap the arrow to switch project or person.', waitFor: ['switch:opened'], placement: 'below' },
  { id: 'timer', route: 'dashboard', target: 'track-time', title: 'Your hours', body: 'Tap Track time to log your hours.', waitFor: null, placement: 'above' },
  { id: 'profile', route: 'dashboard', target: 'profile', title: 'Your profile', body: 'Tap your initials for settings, or to replay this tour.', waitFor: ['profile:opened'], placement: 'above' },
];

const listeners = new Set<(e: GuideEvent) => void>();
export const guideEmit = (e: GuideEvent) => listeners.forEach((l) => l(e));
export function onGuideEvent(l: (e: GuideEvent) => void) {
  listeners.add(l);
  return () => void listeners.delete(l);
}

const DONE_KEY = 'crewser-guide-done';
export function guideDone(): boolean {
  try {
    return localStorage.getItem(DONE_KEY) === '1';
  } catch {
    return true; // No storage: never force the tour on every visit.
  }
}
export function setGuideDone(done: boolean) {
  try {
    if (done) localStorage.setItem(DONE_KEY, '1');
    else localStorage.removeItem(DONE_KEY);
  } catch {
    // Not persisted; the tour may show again next visit.
  }
}
