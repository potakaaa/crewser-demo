import type { Note } from '../mock';
import { Icon } from './Icon';
import { useNoteActions } from '../lib/actions';
import { primaryIcon } from '../lib/notes';

/** A note's own main action (directions, boarding pass, master data), as a primary button. Nothing for a note without one. */
export function NotePrimaryAction({ note, className = 'ccard-action' }: { note: Note; className?: string }) {
  const a = useNoteActions();
  const pa = note.primaryAction;
  if (!pa) return null;
  return (
    <button type="button" className={`btn btn-primary ${className}`} onClick={() => a.primary(note)}>
      <Icon name={primaryIcon(pa.kind)} size={16} color="currentColor" strokeWidth={1.8} />
      {pa.label}
    </button>
  );
}
