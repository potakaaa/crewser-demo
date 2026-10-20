import { useMemo } from 'react';
import type { Note } from '../mock';
import { useDemo } from '../store';
import { Icon } from './Icon';
import { useNoteActions } from '../lib/actions';
import { fakeQr, qrPath, QR_SIZE } from '../lib/qr';

/** The (fake) scannable code from the ticket PDF, drawn crisp at any size. */
export function QrCode({ size, label }: { size: number; label: string }) {
  const path = useMemo(() => qrPath(fakeQr()), []);
  return (
    <svg {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })} width={size} height={size} viewBox={`0 0 ${QR_SIZE} ${QR_SIZE}`} shapeRendering="crispEdges">
      <rect width={QR_SIZE} height={QR_SIZE} fill="#FFFFFF" />
      <path d={path} fill="#0E1314" />
    </svg>
  );
}

/**
 * Inline preview of a note's boarding-pass code, so it is visible without opening anything.
 * Tapping it opens the full-screen boarding pass. Without a readable code it says so.
 */
export function QrPreview({ note }: { note: Note }) {
  const codeFound = useDemo((s) => s.codeFound);
  const a = useNoteActions();
  const file = note.attachments[0]?.file ?? '';

  if (!codeFound) {
    // Same tile as a found code, with an empty dashed slot where the code would be.
    return (
      <button type="button" className="qr-preview" onClick={() => a.openPdf(file)} aria-label={`No scannable code in ${file}. Open the PDF`}>
        <span className="qr-thumb qr-thumb-empty" aria-hidden="true">
          <Icon name="ticket" size={24} color="#54686C" />
          <span>No code</span>
        </span>
        <span className="qr-copy">
          <strong>Boarding pass</strong>
          <span>Show the PDF at check-in and the gate</span>
          <span className="qr-cta">
            Open {file}
            <Icon name="arrowUpRight" size={14} strokeWidth={1.8} />
          </span>
        </span>
      </button>
    );
  }

  return (
    <button type="button" className="qr-preview" onClick={a.openTicket} aria-label={`Boarding pass code from ${file}. Show full screen`}>
      <span className="qr-thumb">
        <QrCode size={76} label="" />
      </span>
      <span className="qr-copy">
        <strong>Boarding pass</strong>
        <span>Code from {file}</span>
        <span className="qr-cta">
          Show full screen
          <Icon name="arrowUpRight" size={14} strokeWidth={1.8} />
        </span>
      </span>
    </button>
  );
}
