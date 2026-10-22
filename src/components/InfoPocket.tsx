import type { Note } from '../mock';
import { useDemo } from '../store';
import { Icon } from './Icon';

/** One slim row for notes without a date. Takes no space when there are none. */
export function InfoPocket({ notes }: { notes: Note[] }) {
  const openSheet = useDemo((s) => s.openSheet);
  if (!notes.length) return null;
  const preview = notes.slice(0, 2).map((n) => n.title).join(' · ');
  return (
    <button type="button" className="pocket" onClick={() => openSheet('info')} aria-label={`General info, ${notes.length} ${notes.length === 1 ? 'note' : 'notes'}: ${preview}. Open`}>
      <span className="pocket-icon">
        <Icon name="plain" size={18} color="#2A3B3F" />
      </span>
      <span className="pocket-text">
        <span className="pocket-t1">
          General info <span className="pocket-count">{notes.length}</span>
        </span>
        <span className="pocket-t2">{preview}</span>
      </span>
      <Icon name="right" size={18} color="#54686C" />
    </button>
  );
}
