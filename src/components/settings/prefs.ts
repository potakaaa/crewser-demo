import { create } from 'zustand';

/** Notification switches. Kept here so they survive switching tabs; nothing is persisted. */
interface Prefs {
  callSheetOut: boolean;
  hoursReminder: boolean;
  toggle: (k: 'callSheetOut' | 'hoursReminder') => void;
}

const defaults = { callSheetOut: true, hoursReminder: true };

export const usePrefs = create<Prefs>()((set) => ({
  ...defaults,
  toggle: (k) => set((s) => ({ [k]: !s[k] }) as Pick<Prefs, typeof k>),
}));

/** Back to the starting switches; the store's reset() calls this. */
export const resetPrefs = () => usePrefs.setState(defaults);
