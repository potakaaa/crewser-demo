import { useDemo } from '../../store';
import type { Contact } from '../../mock';

/** Call, message and mail are mocked with a toast; copying the number really copies it. */
export function useContactActions() {
  const toast = useDemo((s) => s.showToast);
  return {
    call: (c: Contact) => toast(`Calling ${c.name} is not part of this demo`),
    message: (c: Contact) => toast(`Messaging ${c.name} is not part of this demo`),
    mail: (c: Contact) => toast(`Writing to ${c.name} is not part of this demo`),
    copy: async (text: string, what: string) => {
      try {
        await navigator.clipboard.writeText(text);
        toast(`${what} copied`);
      } catch {
        toast(`Couldn't copy, ${text}`);
      }
    },
  };
}
