import { today } from '../mock';
import { toMinutes } from './dates';

/** "Good morning" / "Good afternoon" / "Good evening", by the app's clock. */
export function greeting(time: string = today.time): string {
  const h = toMinutes(time) / 60;
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

/** "Slate Bianca" → "Slate". */
export const firstNameOf = (fullName: string) => fullName.trim().split(/\s+/)[0] ?? fullName;
