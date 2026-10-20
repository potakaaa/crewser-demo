// Shared types for the mock data and the components that render it.

export type NoteType = 'flight' | 'hotel' | 'rental' | 'appointment' | 'plain';

/** time = has a clock time, allday = dated without a time, undated = no date at all */
export type NoteKind = 'time' | 'allday' | 'undated';

export type FactAction = 'copy' | 'map';

export interface Fact {
  label: string;
  value: string;
  action?: FactAction;
  /** Not confirmed by production yet: dashed border, grey value. */
  unconfirmed?: boolean;
}

export interface Attachment {
  /** File name, also the key into `pdfs`. */
  file: string;
  /** Short description shown under the file name, e.g. "PDF · ticket". */
  kind: string;
}

export type PrimaryActionKind = 'directions' | 'boardingPass';

export interface PrimaryAction {
  kind: PrimaryActionKind;
  /** Full label, used on cards and the detail footer. */
  label: string;
  /** Short label for the expanded calendar rows. */
  short: string;
}

export interface Airport {
  code: string;
  city: string;
}

export interface Note {
  id: string;
  type: NoteType;
  kind: NoteKind;
  /** "HH:MM", only for kind = time. */
  time?: string;
  /** Small line under the time stub, e.g. "until 22:00" or "Check-in". */
  timeNote?: string;
  /** ISO date "YYYY-MM-DD"; missing for undated notes. */
  day?: string;
  title: string;
  subtitle: string;
  /** Flights only: the big VIE → FNC header. */
  route?: { from: Airport; to: Airport };
  facts: Fact[];
  text: string;
  attachments: Attachment[];
  crew: string;
  source?: string;
  primaryAction?: PrimaryAction;
}

export interface WorkDay {
  /** ISO date "YYYY-MM-DD" */
  date: string;
  /** Hours worked after breaks; 0 = day off. */
  hours: number;
  /** Part of `hours` that counts as night work. */
  night: number;
}

export interface Person {
  firstName: string;
  /** Name as printed on tickets and the staff list. */
  displayName: string;
  initials: string;
  position: string;
}

export interface Project {
  name: string;
  dailyTargetHours: number;
  totalShootDays: number;
  /** Optional subtitles for day groups in the notes list. */
  dayLabels: Record<string, string>;
}

export interface Today {
  /** ISO date the demo is frozen to. */
  date: string;
  /** Clock time the demo is frozen to, "HH:MM". */
  time: string;
  shootDay: number;
  lastSynced: string;
  defaultBreakMin: number;
}

export interface PdfDoc {
  file: string;
  kicker: string;
  title: string;
  line: string;
}
