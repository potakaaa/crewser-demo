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
  /** Who the note is shared with: the whole crew, or these crew member ids. */
  crew: 'all' | string[];
  source?: string;
  primaryAction?: PrimaryAction;
}

export type DayKind = 'prep' | 'shoot';

/** approved by production · submitted and waiting · logged but not sent yet */
export type ApprovalStatus = 'approved' | 'submitted' | 'draft';

/**
 * One logged working day. Hours, overtime, night hours and rest are all derived
 * from start, end and break, so they can never disagree with each other.
 */
export interface WorkDay {
  /** ISO date "YYYY-MM-DD" */
  date: string;
  kind: DayKind;
  /** "HH:MM" */
  start: string;
  /** "HH:MM"; earlier than start means after midnight. */
  end: string;
  breakMin: number;
  status: ApprovalStatus;
}

/** Deal-memo numbers used for the pay estimate. */
export interface Contract {
  currency: 'EUR';
  /** Pay for one day at the daily target. */
  dailyRate: number;
  /** Multiplier on the hourly rate for hours past the daily target (1.5 = 150 %). */
  overtimeRate: number;
  /** Extra on the hourly rate for night hours, 22:00–06:00 (0.5 = +50 %). */
  nightSurcharge: number;
  /** Per diem per day away from home. */
  perDiem: number;
  /** First day per diem is paid (travel to Madeira). */
  perDiemFrom: string;
  /** Minimum rest between two shifts, in hours. */
  minRestHours: number;
}

export interface CrewMember {
  id: string;
  name: string;
  initials: string;
  position: string;
  department: string;
  /** Avatar background, a pale tint so the ink initials stay readable. */
  tint: string;
}

export interface Person {
  /** The crew member using the app. */
  id: string;
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
