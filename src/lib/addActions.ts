import { useDemo } from '../store';
import type { IconName } from '../components/Icon';

/** The things crew add from anywhere: the + menu and Home's quick row show this same list. */
export interface AddAction {
  id: 'time' | 'invoice';
  label: string;
  icon: IconName;
  run: () => void;
}

export function useAddActions(): AddAction[] {
  const openLog = useDemo((s) => s.setLogOpen);
  const openSheet = useDemo((s) => s.openSheet);
  return [
    { id: 'time', label: 'Track time', icon: 'logTime', run: () => openLog(true) },
    { id: 'invoice', label: 'Scan invoice', icon: 'scan', run: () => openSheet('invoice') },
  ];
}
