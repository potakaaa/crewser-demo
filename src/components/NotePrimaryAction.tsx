import type { Note } from '../mock';
import { Icon } from './Icon';
import { useNoteActions } from '../lib/actions';

/** A note's own main action (directions, boarding pass), as a primary button. Nothing for a note without one. */
export function NotePrimaryAction({ note, className = 'ccard-action' }: { note: Note; className?: string }) {
  const a = useNoteActions();
  const pa = note.primaryAction;
  if (!pa) return null;
  return (
    <button type="button" className={`btn btn-primary ${className}`} onClick={() => a.primary(note)}>
      <Icon name={pa.kind === 'boardingPass' ? 'ticket' : 'nav'} size={16} color="#FFFFFF" strokeWidth={1.8} />
      {pa.label}
    </button>
  );
}
