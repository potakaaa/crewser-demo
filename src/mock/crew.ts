import type { CrewMember } from './types';

/**
 * The 20 people on the project. The first five and their avatar tints come from the
 * Inspector design board; the rest follow the same naming style.
 */
export const crew: CrewMember[] = [
  { id: 'ff', name: 'Focus Florentina', initials: 'FF', position: '1st AC', department: 'Camera', tint: '#C0D6DB' },
  { id: 'll', name: 'Lumen Leopold', initials: 'LL', position: 'Director of Photography', department: 'Camera', tint: '#CFE0E8' },
  { id: 'nn', name: 'Negative Nikolai', initials: 'NN', position: 'Loader', department: 'Camera', tint: '#D9E3CF' },
  { id: 'gg', name: 'Gaffer Greta', initials: 'GG', position: 'Gaffer', department: 'Lighting', tint: '#E5D7B0' },
  { id: 'bi', name: 'Slate Bianca', initials: 'SB', position: '2nd AC', department: 'Camera', tint: '#E8D9CF' },
  { id: 'kk', name: 'Key Karin', initials: 'KK', position: 'Key Grip', department: 'Grip', tint: '#E3E8C8' },
  { id: 'do', name: 'Dolly Dominik', initials: 'DD', position: 'Dolly Grip', department: 'Grip', tint: '#E0D6C8' },
  { id: 'br', name: 'Boom Brendan', initials: 'BB', position: 'Boom Operator', department: 'Sound', tint: '#D5DBDC' },
  { id: 'mm', name: 'Mixer Maja', initials: 'MM', position: 'Sound Mixer', department: 'Sound', tint: '#D6D3E8' },
  { id: 'dd', name: 'Director Dora', initials: 'DD', position: 'Director', department: 'Directing', tint: '#E8D3DC' },
  { id: 'aa', name: 'Assistant Aylin', initials: 'AA', position: '1st AD', department: 'Directing', tint: '#D3E4DC' },
  { id: 'ss', name: 'Script Sami', initials: 'SS', position: 'Script Supervisor', department: 'Directing', tint: '#E6E0CC' },
  { id: 'pp', name: 'Prop Paula', initials: 'PP', position: 'Props', department: 'Art', tint: '#E8DCCB' },
  { id: 'se', name: 'Set Selim', initials: 'SS', position: 'Set Designer', department: 'Art', tint: '#D8DEE8' },
  { id: 'cc', name: 'Costume Clara', initials: 'CC', position: 'Costume Designer', department: 'Costume & make-up', tint: '#ECD8D3' },
  { id: 'mi', name: 'Makeup Mira', initials: 'MM', position: 'Make-up Artist', department: 'Costume & make-up', tint: '#E1D5E6' },
  { id: 'cn', name: 'Coordinator Conny', initials: 'CC', position: 'Production Coordinator', department: 'Production', tint: '#D2E2E4' },
  { id: 'lu', name: 'Location Lukas', initials: 'LL', position: 'Location Manager', department: 'Production', tint: '#DCE5D2' },
  { id: 'rr', name: 'Runner Rosa', initials: 'RR', position: 'Runner', department: 'Production', tint: '#EADFD0' },
  { id: 'mx', name: 'Matte Maxine', initials: 'MM', position: 'VFX Supervisor', department: 'VFX', tint: '#D7DCE0' },
];

/** The nine going to Madeira: flight, hotel, van and the Madeira shoot days. */
export const madeiraTeam = ['ff', 'll', 'nn', 'gg', 'br', 'dd', 'aa', 'mm', 'kk'];
