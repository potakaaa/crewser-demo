import { useState } from 'react';
import { useDemo, type Route } from '../store';
import { Wordmark } from './Brand';
import { version } from '../../package.json';
import { today } from '../mock';
import { fmtDayMonth } from '../lib/dates';

/** package.json is 0.N.0 while this is a prototype: N is the crew app generation (v4). */
const GENERATION = `v${version.split('.')[1]}`;

const JUMPS: { label: string; route?: Route; note?: string; log?: boolean; sheet?: 'invoice' | 'timer' }[] = [
  { label: 'Home', route: { name: 'dashboard' } },
  { label: 'Calendar', route: { name: 'calendar' } },
  { label: 'Documents', route: { name: 'documents' } },
  { label: 'Contacts', route: { name: 'contacts' } },
  { label: 'Settings', route: { name: 'settings' } },
  { label: 'Flight note', note: 'fl' },
  { label: 'Boarding pass', route: { name: 'ticket' } },
  { label: 'Ticket PDF', route: { name: 'pdf', file: 'Ticket_OS487.pdf' } },
  { label: 'Track time', log: true },
  { label: 'Scan invoice', sheet: 'invoice' },
];

function Toggle({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="dp-toggle">
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="dp-switch" aria-hidden="true" />
      <span className="dp-toggle-text">
        <span>{label}</span>
        <small>{hint}</small>
      </span>
    </label>
  );
}

/** Desktop-only controls outside the phone: demo states, shortcuts and reset. */
export function DemoPanel() {
  const [open, setOpen] = useState(false);
  const offline = useDemo((s) => s.offline);
  const empty = useDemo((s) => s.empty);
  const codeFound = useDemo((s) => s.codeFound);
  const setFlag = useDemo((s) => s.setFlag);
  const navigate = useDemo((s) => s.navigate);
  const setLogOpen = useDemo((s) => s.setLogOpen);
  const reset = useDemo((s) => s.reset);
  const openSheet = useDemo((s) => s.openSheet);
  const startGuide = useDemo((s) => s.startGuide);

  return (
    <aside className="side">
      <div className="caption">
        {/* The mark has a dark and a light version; the page follows the system theme, so show the one that reads. */}
        <Wordmark tone="dark" className="caption-wordmark only-light-page" />
        <Wordmark tone="light" className="caption-wordmark only-dark-page" />
        <div>
          <p className="caption-title">Crew app · prototype with mock data</p>
          <p className="caption-sub">
            Crew {GENERATION} · {fmtDayMonth(today.date)} 2026, {today.time} · nothing here is live.
          </p>
        </div>
      </div>
      <div className="side-actions">
        <button type="button" className="side-btn" onClick={reset}>
          Reset demo
        </button>
        <button type="button" className="side-btn" aria-expanded={open} aria-controls="demo-controls" onClick={() => setOpen((v) => !v)}>
          Demo controls
        </button>
      </div>
      <div id="demo-controls" className="demo-panel" hidden={!open}>
        <div className="dp-top">
          <span>Demo controls</span>
          <button type="button" className="dp-close" aria-label="Close demo controls" onClick={() => setOpen(false)}>
            ×
          </button>
        </div>
        <p className="dp-h">States</p>
        <Toggle label="Offline" hint="Amber banner with last sync" checked={offline} onChange={(v) => setFlag('offline', v)} />
        <Toggle label="Empty" hint="Nothing on the sheet yet" checked={empty} onChange={(v) => setFlag('empty', v)} />
        <Toggle label="No code in PDF" hint="Boarding pass fallback" checked={!codeFound} onChange={(v) => setFlag('codeFound', !v)} />
        <p className="dp-h">Guide</p>
        <div className="dp-jumps">
          <button type="button" className="dp-jump" onClick={startGuide}>
            Replay the first-visit guide
          </button>
        </div>
        <p className="dp-h">Jump to</p>
        <div className="dp-jumps">
          {JUMPS.map((j) => (
            <button
              type="button"
              key={j.label}
              className="dp-jump"
              onClick={() => {
                if (j.route) navigate(j.route);
                if (j.note) {
                  navigate({ name: 'dashboard' });
                  openSheet('note', j.note);
                }
                if (j.log) {
                  navigate({ name: 'dashboard' });
                  setLogOpen(true);
                }
                if (j.sheet) {
                  navigate({ name: 'dashboard' });
                  openSheet(j.sheet);
                }
              }}
            >
              {j.label}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
