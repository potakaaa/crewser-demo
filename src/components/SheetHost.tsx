import { useEffect, useRef } from 'react';
import { useDemo, type SheetKind, type SheetState } from '../store';
import { contacts, links } from '../mock';
import { BottomSheet } from './BottomSheet';
import { NoteSheet, noteSheetMeta } from './sheets/NoteSheet';
import { HoursSheet, hoursSheetMeta } from './sheets/HoursSheet';
import { InfoSheet, infoSheetMeta } from './sheets/InfoSheet';
import { ContactSheet } from './sheets/ContactSheet';
import { NotificationsSheet, notificationsSheetMeta } from './sheets/NotificationsSheet';
import { ProjectSwitcher } from './ProjectSwitcher';

interface Meta {
  title: string;
  subtitle?: string;
  /** 'soft' for sheets made of white cards. */
  tone?: 'white' | 'soft';
}

/** Header of each sheet kind. Edit your kind's entry when its sheet needs a better title. */
const META: Record<SheetKind, (id?: string) => Meta> = {
  note: (id) => ({ ...noteSheetMeta(id), tone: 'soft' }),
  hours: (id) => ({ ...hoursSheetMeta(id), tone: 'soft' }),
  info: (id) => ({ ...infoSheetMeta(id), tone: 'soft' }),
  project: () => ({ title: 'Your projects', subtitle: `${links.length} crew links on this phone`, tone: 'soft' }),
  notifications: () => ({ ...notificationsSheetMeta(), tone: 'soft' }),
  contact: (id) => {
    const c = contacts.find((x) => x.id === id);
    return { title: c?.name ?? 'Contact', subtitle: c?.position };
  },
};

function Body({ sheet }: { sheet: SheetState }) {
  switch (sheet.kind) {
    case 'note':
      return <NoteSheet id={sheet.id} />;
    case 'hours':
      return <HoursSheet id={sheet.id} />;
    case 'info':
      return <InfoSheet id={sheet.id} />;
    case 'project':
      return <ProjectSwitcher />;
    case 'contact':
      return <ContactSheet id={sheet.id} />;
    case 'notifications':
      return <NotificationsSheet />;
  }
}

/** Renders whichever sheet `store.sheet` names inside the shared BottomSheet. Open it with `openSheet(kind, id)`. */
export function SheetHost() {
  const sheet = useDemo((s) => s.sheet);
  const close = useDemo((s) => s.closeSheet);
  // Keep the last content mounted while the sheet animates closed.
  const last = useRef<SheetState | null>(null);
  if (sheet) last.current = sheet;
  const shown = sheet ?? last.current;
  const contentKey = shown ? `${shown.kind}:${shown.id ?? ''}` : '';
  const host = useRef<HTMLDivElement>(null);
  // A sheet dragged down to close returns to the sheet it came from instead of closing, so the
  // dialog is still where the finger left it: ease it back into place.
  useEffect(() => {
    const dialog = host.current?.closest<HTMLElement>('.log-dialog');
    const scrim = dialog?.closest<HTMLElement>('.scrim');
    if (!dialog || !dialog.style.translate) return;
    dialog.style.transition = 'translate 240ms var(--ease-ios)';
    dialog.style.translate = '0 0';
    if (scrim) scrim.style.background = '';
    const t = window.setTimeout(() => {
      dialog.style.transition = '';
      dialog.style.translate = '';
    }, 260);
    return () => window.clearTimeout(t);
  }, [contentKey]);
  if (!shown) return null;
  const meta = META[shown.kind](shown.id);
  return (
    <BottomSheet open={sheet !== null} onClose={close} title={meta.title} subtitle={meta.subtitle} tone={meta.tone} contentKey={contentKey}>
      <div ref={host} style={{ display: 'contents' }}>
        <Body key={contentKey} sheet={shown} />
      </div>
    </BottomSheet>
  );
}
