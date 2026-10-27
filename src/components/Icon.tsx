import { HugeiconsIcon } from '@hugeicons/react';
import type { IconSvgElement } from '@hugeicons/react';
import {
  Airplane01Icon,
  Alert02Icon,
  Analytics01Icon,
  Appointment01Icon,
  ArrowDown01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ArrowRight02Icon,
  ArrowUp01Icon,
  ArrowUpRight01Icon,
  Attachment01Icon,
  Calendar03Icon,
  Call02Icon,
  Cancel01Icon,
  ContactBookIcon,
  Copy01Icon,
  DashboardSquare02Icon,
  Download04Icon,
  File01Icon,
  Files01Icon,
  Home01Icon,
  Hotel01Icon,
  Key01Icon,
  Link01Icon,
  Location01Icon,
  MapsLocation01Icon,
  Message01Icon,
  Notification03Icon,
  Pdf01Icon,
  QrCodeIcon,
  ReceiptEuroIcon,
  SecurityCheckIcon,
  TextFontIcon,
  UserIcon,
  GlobalIcon,
  Folder01Icon,
  Mail01Icon,
  MinusSignIcon,
  Navigation03Icon,
  PlusSignIcon,
  Search01Icon,
  Settings02Icon,
  StickyNote01Icon,
  Sun03Icon,
  Tick02Icon,
  Ticket01Icon,
  TimeQuarterPassIcon,
  UserAccountIcon,
  UserGroupIcon,
  WifiOff01Icon,
} from '@hugeicons/core-free-icons';
import type { NoteType } from '../mock';

// Hugeicons Stroke Rounded (free set), named after what they mean in the app.
export const icons = {
  flight: Airplane01Icon,
  hotel: Hotel01Icon,
  rental: Key01Icon,
  appointment: Appointment01Icon,
  plain: StickyNote01Icon,
  ticket: Ticket01Icon,
  clip: Attachment01Icon,
  pin: Location01Icon,
  copy: Copy01Icon,
  nav: Navigation03Icon,
  file: File01Icon,
  download: Download04Icon,
  users: UserGroupIcon,
  calendar: Calendar03Icon,
  home: Home01Icon,
  dashboard: DashboardSquare02Icon,
  documents: Files01Icon,
  contacts: ContactBookIcon,
  settings: Settings02Icon,
  call: Call02Icon,
  message: Message01Icon,
  bell: Notification03Icon,
  globe: GlobalIcon,
  shield: SecurityCheckIcon,
  link: Link01Icon,
  qr: QrCodeIcon,
  font: TextFontIcon,
  user: UserIcon,
  pdf: Pdf01Icon,
  folder: Folder01Icon,
  map: MapsLocation01Icon,
  mail: Mail01Icon,
  check: Tick02Icon,
  stats: Analytics01Icon,
  search: Search01Icon,
  arrowUpRight: ArrowUpRight01Icon,
  wifiOff: WifiOff01Icon,
  sun: Sun03Icon,
  idCard: UserAccountIcon,
  logTime: TimeQuarterPassIcon,
  close: Cancel01Icon,
  down: ArrowDown01Icon,
  up: ArrowUp01Icon,
  right: ArrowRight01Icon,
  left: ArrowLeft01Icon,
  arrowRight: ArrowRight02Icon,
  alert: Alert02Icon,
  minus: MinusSignIcon,
  plus: PlusSignIcon,
  scan: ReceiptEuroIcon,
} satisfies Record<string, IconSvgElement>;

export type IconName = keyof typeof icons;

export const noteIcon = (t: NoteType): IconName => t;

interface Props {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
  className?: string;
}

export function Icon({ name, size = 18, color = 'currentColor', strokeWidth = 1.6, className }: Props) {
  return (
    <HugeiconsIcon
      icon={icons[name]}
      size={size}
      color={color}
      strokeWidth={strokeWidth}
      className={className}
      aria-hidden="true"
      focusable="false"
    />
  );
}
