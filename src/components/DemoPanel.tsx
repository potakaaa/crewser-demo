import { useState } from 'react';
import { useDemo, type Route } from '../store';
import { Wordmark } from './Brand';

const JUMPS: { label: string; route?: Route; log?: boolean }[] = [
  { label: 'Home', route: { name: 'home' } },
  { label: 'Calendar', route: { name: 'calendar' } },
  { label: 'Statistics', route: { name: 'stats' } },
  { label: 'Flight detail', route: { name: 'note', id: 'fl' } },
  { label: 'Boarding pass', route: { name: 'ticket' } },
  { label: 'Ticket PDF', route: { name: 'pdf', file: 'Ticket_OS487.pdf' } },
  { label: 'Log sheet', log: true },
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

  return (
    <aside className="side">
      <div className="caption">
        <Wordmark tone="dark" className="caption-wordmark" />
        <div>
          <p className="caption-title">Crew app · prototype with mock data</p>
          <p className="caption-sub">Crew v3 · Mon 19 Oct 2026, 08:40 · nothing here is live.</p>
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
        <p className="dp-h">States</p>
        <Toggle label="Offline" hint="Amber banner with last sync" checked={offline} onChange={(v) => setFlag('offline', v)} />
        <Toggle label="Empty" hint="Nothing on the sheet yet" checked={empty} onChange={(v) => setFlag('empty', v)} />
        <Toggle label="No code in PDF" hint="Boarding pass fallback" checked={!codeFound} onChange={(v) => setFlag('codeFound', !v)} />
        <p className="dp-h">Jump to</p>
        <div className="dp-jumps">
          {JUMPS.map((j) => (
            <button
              type="button"
              key={j.label}
              className="dp-jump"
              onClick={() => {
                if (j.route) navigate(j.route);
                if (j.log) {
                  navigate({ name: 'home' });
                  setLogOpen(true);
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
