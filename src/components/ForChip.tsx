import { useActiveLink } from '../store';
import { firstNameOf } from '../lib/greeting';

/**
 * "For Bianca · 2nd AC": a small chip that says whose hours this app is entering. Renders nothing on your own link.
 * The words are visual; screen readers get the full name and role once. `compact` drops the visible role, for rows with no room; `bare` also drops the "For".
 */
export function ForChip({ compact, bare }: { compact?: boolean; bare?: boolean }) {
  const link = useActiveLink();
  if (link.isMe) return null;
  return (
    <span className="for-chip" data-tone="dark">
      <span className="for-chip-dot" aria-hidden="true" />
      <span className="for-chip-name" aria-hidden="true">{bare ? '' : 'For '}{firstNameOf(link)}</span>
      {!compact && (
        <span className="for-chip-role" aria-hidden="true">
          {link.position}
        </span>
      )}
      <span className="sr-only">Entering hours for {link.personName}, {link.position}.</span>
    </span>
  );
}
