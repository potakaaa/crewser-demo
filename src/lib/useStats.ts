import { useMemo } from 'react';
import { useDemo } from '../store';
import { computeStats, type Period } from './stats';

/** Statistics for the period chosen on the Statistics screen, including days submitted here. */
export function useStats() {
  const kind = useDemo((s) => s.statsPeriod);
  const monday = useDemo((s) => s.statsWeek);
  const submitted = useDemo((s) => s.submitted);
  return useMemo(() => {
    const period: Period = kind === 'week' ? { kind: 'week', monday } : { kind: 'project' };
    return computeStats(period, submitted);
  }, [kind, monday, submitted]);
}
