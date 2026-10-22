import { useDemo } from '../store';

const NONE: string[] = [];

/** ISO dates the active crew link has sent to production. The one place the dashboard reads this from. */
export const useSubmitted = () => useDemo((s) => s.submitted[s.activeLinkId] ?? NONE);
