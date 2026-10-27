import { useDemo } from '../store';
import type { IconName } from '../components/Icon';

/** The things crew add from anywhere: the + menu and Home's quick row show this same list. */
export interface AddAction {
  id: 'time' | 'invoice';
  label: string;
  hint: string;
  icon: IconName;
  run: () => void;
}

export function useAddActions(): AddAction[] {
  const openLog = useDemo((s) => s.setLogOpen);
  const openSheet = useDemo((s) => s.openSheet);
  return [
    { id: 'time', label: 'Track time', hint: "Today's hours", icon: 'logTime', run: () => openLog(true) },
    { id: 'invoice', label: 'Scan invoice', hint: 'From a photo', icon: 'scan', run: () => openSheet('invoice') },
  ];
}
