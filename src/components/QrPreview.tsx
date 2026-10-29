import { useMemo, useState } from 'react';
import { person, type Note } from '../mock';
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
 * Small preview of a note's boarding-pass code in lists (an expanded row). Tapping it opens the note,
 * where the code is shown large. Without a readable code it says so and opens the PDF.
 */
export function QrPreview({ note }: { note: Note }) {
  const codeFound = useDemo((s) => s.codeFound);
  const a = useNoteActions();
  const file = note.attachments[0]?.file ?? '';

  if (!codeFound) {
    return (
      <button type="button" className="qr-preview" onClick={() => a.openPdf(file)} aria-label={`No scannable code in ${file}. Open the PDF`}>
        <span className="qr-thumb qr-thumb-empty" aria-hidden="true">
          <Icon name="ticket" size={24} color="#9AAAAC" />
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
    <button type="button" className="qr-preview" onClick={() => a.openNote(note.id)} aria-label={`Boarding pass code from ${file}. Open the note`}>
      <span className="qr-thumb">
        <QrCode size={76} label="" />
      </span>
      <span className="qr-copy">
        <strong>Boarding pass</strong>
        <span>Code from {file}</span>
        <span className="qr-cta">
          Open boarding pass
          <Icon name="arrowUpRight" size={14} strokeWidth={1.8} />
        </span>
      </span>
    </button>
  );
}

function PassTool({ label, on, onChange, icon }: { label: string; on: boolean; onChange: (v: boolean) => void; icon: 'sun' | 'check' }) {
  return (
    <button type="button" className="pass-tool" aria-pressed={on} onClick={() => onChange(!on)}>
      <Icon name={icon} size={15} color="currentColor" strokeWidth={1.8} />
      {label}
    </button>
  );
}

/** The boarding pass inside the flight note: the code at scanning size, the passenger, brightness and keep-on switches. Without a readable code, the PDF is the pass. */
export function BoardingPassCode({ note }: { note: Note }) {
  const codeFound = useDemo((s) => s.codeFound);
  const a = useNoteActions();
  const [bright, setBright] = useState(true);
  const [awake, setAwake] = useState(true);
  const file = note.attachments[0]?.file ?? '';

  if (!codeFound) {
    return (
      <div className="pass" role="status">
        <strong className="pass-warn">No scannable code in this PDF</strong>
        <span className="pass-line">We could not read a QR, Aztec or PDF417 code in {file}. Show the original PDF at check-in and the gate.</span>
        <button type="button" className="btn btn-primary btn-lg pass-open" onClick={() => a.openPdf(file)}>
          <Icon name="file" size={18} color="currentColor" strokeWidth={1.8} />
          Open original PDF
        </button>
      </div>
    );
  }

  // A web page cannot change the phone's brightness or wake lock, so the demo confirms with a toast.
  const toggle = (what: string, set: (v: boolean) => void) => (v: boolean) => {
    set(v);
    a.toast(`${what} ${v ? 'on' : 'off'} (demo)`);
  };
  return (
    <div className="pass">
      <div className="pass-code">
        <QrCode size={232} label={`Scannable boarding pass code from ${file}`} />
      </div>
      <p className="pass-line">
        <strong>{person.displayName}</strong> · Code from {file}
      </p>
      <div className="pass-tools">
        <PassTool icon="sun" label="Turn brightness up" on={bright} onChange={toggle('Full brightness', setBright)} />
        <PassTool icon="check" label="Screen stays on" on={awake} onChange={toggle('Screen stays on', setAwake)} />
      </div>
    </div>
  );
}
