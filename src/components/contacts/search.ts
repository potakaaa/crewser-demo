import type { Contact } from '../../mock';

/** Lower case without accents, so "Zoe" finds "Zoë". */
export const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

const PHONE_QUERY = /^[\d\s+()-]+$/;
const digits = (s: string) => s.replace(/\D/g, '');

/**
 * Every word of the query must appear in name, position or department. A query that
 * is only digits and phone punctuation searches the number instead, in international
 * (+43 664 …) or national (0664 …) form.
 */
export function matchesContact(c: Contact, query: string): boolean {
  const q = query.trim();
  if (!q) return true;
  if (PHONE_QUERY.test(q)) {
    const d = digits(q).replace(/^0{1,2}/, '');
    return d.length >= 2 && digits(c.phone).includes(d);
  }
  const hay = fold(`${c.name} ${c.position} ${c.department}`);
  return fold(q)
    .split(/\s+/)
    .every((t) => hay.includes(t));
}
