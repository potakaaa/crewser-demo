import { create } from 'zustand';

/** Notification switches. Kept here so they survive switching tabs; nothing is persisted. */
interface Prefs {
  callSheetOut: boolean;
  hoursReminder: boolean;
  toggle: (k: 'callSheetOut' | 'hoursReminder') => void;
}

export const usePrefs = create<Prefs>()((set) => ({
  callSheetOut: true,
  hoursReminder: true,
  toggle: (k) => set((s) => ({ [k]: !s[k] }) as Pick<Prefs, typeof k>),
}));
