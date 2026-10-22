import { useDemo } from '../store';

/** ISO dates the crew member has sent to production. The one place the dashboard reads this from. */
export const useSubmitted = () => useDemo((s) => s.submitted);
