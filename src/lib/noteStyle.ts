import type { CSSProperties } from 'react';
import type { NoteType } from '../mock';

/**
 * One colour per note type, so a flight never looks like a hotel at a glance.
 * fg/bg: icon chip on the dark cards (fg ≥ 4.5:1 on bg over --card). dot: marker on the dark header.
 */
export const TYPE_COLOR: Record<NoteType, { fg: string; bg: string; dot: string }> = {
  appointment: { fg: '#6FD0C8', bg: 'rgba(111, 208, 200, 0.14)', dot: '#6FD0C8' },
  flight: { fg: '#8DB8F5', bg: 'rgba(141, 184, 245, 0.14)', dot: '#8DB8F5' },
  hotel: { fg: '#D4A8F0', bg: 'rgba(212, 168, 240, 0.14)', dot: '#D4A8F0' },
  rental: { fg: '#F5B27A', bg: 'rgba(245, 178, 122, 0.14)', dot: '#F5B27A' },
  plain: { fg: '#F4A3BD', bg: 'rgba(244, 163, 189, 0.14)', dot: '#F4A3BD' },
  task: { fg: '#D7E336', bg: 'rgba(215, 227, 54, 0.14)', dot: '#D7E336' },
};

/** Inline style for an icon chip of this type. */
export const chipStyle = (t: NoteType): CSSProperties => ({ background: TYPE_COLOR[t].bg, color: TYPE_COLOR[t].fg });
