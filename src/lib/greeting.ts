import { today } from '../mock';
import type { CrewLink } from '../mock';
import { toMinutes } from './dates';

/** "Good morning" / "Good afternoon" / "Good evening", by the app's clock. */
export function greeting(time: string = today.time): string {
  const h = toMinutes(time) / 60;
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

/** What to call the person on a link: their first name, or the last word of their name when none is set. */
export const firstNameOf = (link: Pick<CrewLink, 'personName' | 'firstName'>) => link.firstName ?? (link.personName.trim().split(/\s+/).pop() || link.personName);
