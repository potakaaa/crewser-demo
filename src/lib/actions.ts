import { useDemo } from '../store';
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
  const openTicket = () => navigate({ name: 'ticket' });

  return {
    copy,
    toast,
    openPdf,
    openTicket,
    openNote: (id: string) => openSheet('note', id),
    map: (place: string) => toast(`Opens “${place}” in maps (demo)`),
    directions: () => toast('Directions open in your maps app (demo)'),
    unconfirmed: (label: string) => toast(`${label} is not confirmed by production yet`),
    primary: (n: Note) => (n.primaryAction?.kind === 'boardingPass' ? openTicket() : toast('Directions open in your maps app (demo)')),
    quick: (n: Note) => {
      const q = quickAction(n);
      if (q === 'ticket') openTicket();
      else if (q === 'pdf') openPdf(n.attachments[0].file);
    },
  };
}
