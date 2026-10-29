import { useDemo, type SheetState } from '../store';
import type { Note } from '../mock';
import { quickAction } from './notes';

/** Shared click handlers. Anything without real logic in the prototype answers with a toast. */
export function useNoteActions() {
  const navigate = useDemo((s) => s.navigate);
  const toast = useDemo((s) => s.showToast);
  const openSheet = useDemo((s) => s.openSheet);

  const copy = (value: string) => {
    try {
      void navigator.clipboard?.writeText(value).catch(() => undefined);
    } catch {
      // Clipboard can be blocked (insecure context, permissions). The demo still confirms.
    }
    toast(`Copied “${value}”`);
  };

  const openPdf = (file: string) => navigate({ name: 'pdf', file });
  const openNote = (id: string) => openSheet('note', id);

  return {
    copy,
    toast,
    openPdf,
    openNote,
    map: (place: string) => toast(`Opens “${place}” in maps (demo)`),
    directions: () => toast('Directions open in your maps app (demo)'),
    /** `from` is the sheet to come back to when the master data form closes. */
    primary: (n: Note, from?: SheetState) => {
      const kind = n.primaryAction?.kind;
      if (kind === 'boardingPass') openNote(n.id);
      else if (kind === 'masterData') openSheet('info', 'master', from);
      else toast('Directions open in your maps app (demo)');
    },
    quick: (n: Note) => {
      const q = quickAction(n);
      if (q === 'ticket') openNote(n.id);
      else if (q === 'pdf') openPdf(n.attachments[0].file);
    },
  };
}
