import type { CSSProperties } from 'react';
import type { NoteType } from '../mock';

/**
 * One colour per note type, so a flight never looks like a hotel at a glance.
 * fg/bg: icon chip on light surfaces (fg ≥ 4:1 on bg). dot: marker on the dark header.
 */
export const TYPE_COLOR: Record<NoteType, { fg: string; bg: string; dot: string }> = {
  appointment: { fg: '#2C6B72', bg: '#E1EFEE', dot: '#6FD0C8' },
  flight: { fg: '#2F66B3', bg: '#E3ECF9', dot: '#8DB8F5' },
  hotel: { fg: '#8443AA', bg: '#F0E6F7', dot: '#D4A8F0' },
  rental: { fg: '#A85A14', bg: '#FBEADB', dot: '#F5B27A' },
  plain: { fg: '#B03E64', bg: '#FBE6EC', dot: '#F4A3BD' },
};

/** Inline style for an icon chip of this type. */
export const chipStyle = (t: NoteType): CSSProperties => ({ background: TYPE_COLOR[t].bg, color: TYPE_COLOR[t].fg });
