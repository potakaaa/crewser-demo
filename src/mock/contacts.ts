import type { Contact } from './types';

const mail = (handle: string) => `${handle}@nordlicht-film.example`;

/** The project's staff list. Production office comes first and is pinned. */
export const contacts: Contact[] = [
  { id: 'office', name: 'Production office', initials: 'PO', position: 'Call 24/7 on shoot days', department: 'Production', phone: '+43 1 555 01 00', email: mail('office'), tint: '#DBF227', pinned: true },
  { id: 'cn', name: 'Coordinator Conny', initials: 'CC', position: 'Production Coordinator', department: 'Production', phone: '+43 664 555 01 12', email: mail('conny'), tint: '#D2E2E4', pinned: true },
  { id: 'rr', name: 'Runner Rosa', initials: 'RR', position: 'Runner', department: 'Production', phone: '+43 664 555 01 19', email: mail('rosa'), tint: '#EADFD0' },
  { id: 'aa', name: 'Assistant Aylin', initials: 'AA', position: '1st AD', department: 'Production', phone: '+43 664 555 01 21', email: mail('aylin'), tint: '#D3E4DC' },
  { id: 'll', name: 'Lumen Leopold', initials: 'LL', position: 'Director of Photography', department: 'Camera', phone: '+43 664 555 02 01', email: mail('leopold'), tint: '#CFE0E8' },
  { id: 'ff', name: 'Focus Florentina', initials: 'FF', position: '1st AC', department: 'Camera', phone: '+43 664 555 02 04', email: mail('florentina'), tint: '#C0D6DB' },
  { id: 'nn', name: 'Negative Nikolai', initials: 'NN', position: 'Loader', department: 'Camera', phone: '+43 664 555 02 07', email: mail('nikolai'), tint: '#D9E3CF' },
  { id: 'bi', name: 'Slate Bianca', initials: 'SB', position: '2nd AC', department: 'Camera', phone: '+43 664 555 02 05', email: mail('bianca'), tint: '#E8D9CF' },
  { id: 'sp', name: 'Mag Samir', initials: 'MS', position: 'Camera Loader', department: 'Camera', phone: '+43 664 555 02 08', email: mail('samir'), tint: '#E3E8C8' },
  { id: 'gg', name: 'Gaffer Greta', initials: 'GG', position: 'Gaffer', department: 'Lighting', phone: '+43 664 555 03 01', email: mail('greta'), tint: '#E5D7B0' },
  { id: 'kk', name: 'Key Karin', initials: 'KK', position: 'Key Grip', department: 'Grip', phone: '+43 664 555 04 01', email: mail('karin'), tint: '#E3E8C8' },
  { id: 'do', name: 'Dolly Dominik', initials: 'DD', position: 'Dolly Grip', department: 'Grip', phone: '+43 664 555 04 03', email: mail('dominik'), tint: '#E0D6C8' },
  { id: 'mm', name: 'Mixer Maja', initials: 'MM', position: 'Sound Mixer', department: 'Sound', phone: '+43 664 555 05 01', email: mail('maja'), tint: '#D6D3E8' },
  { id: 'br', name: 'Boom Brendan', initials: 'BB', position: 'Boom Operator', department: 'Sound', phone: '+43 664 555 05 02', email: mail('brendan'), tint: '#D5DBDC' },
  { id: 'se', name: 'Set Selim', initials: 'SS', position: 'Set Designer', department: 'Art', phone: '+43 664 555 06 01', email: mail('selim'), tint: '#D8DEE8' },
  { id: 'pp', name: 'Prop Paula', initials: 'PP', position: 'Props', department: 'Art', phone: '+43 664 555 06 04', email: mail('paula'), tint: '#E8DCCB' },
  { id: 'cc', name: 'Costume Clara', initials: 'CC', position: 'Costume Designer', department: 'Costume', phone: '+43 664 555 07 01', email: mail('clara'), tint: '#ECD8D3' },
  { id: 'mi', name: 'Makeup Mira', initials: 'MM', position: 'Make-up Artist', department: 'Make-up', phone: '+43 664 555 08 01', email: mail('mira'), tint: '#E1D5E6' },
  { id: 'lu', name: 'Location Lukas', initials: 'LL', position: 'Location Manager', department: 'Locations', phone: '+43 664 555 09 01', email: mail('lukas'), tint: '#DCE5D2' },
  { id: 'lh', name: 'Harbour Hannes', initials: 'HH', position: 'Location Assistant', department: 'Locations', phone: '+351 91 555 09 02', email: mail('hannes'), tint: '#D7DCE0' },
];

/** Department order for grouping. */
export const CONTACT_DEPARTMENTS = ['Production', 'Camera', 'Lighting', 'Grip', 'Sound', 'Art', 'Costume', 'Make-up', 'Locations'] as const;
