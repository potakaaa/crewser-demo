import { useState } from 'react';
import { FONT_THEMES, useDemo, type NoteAccent, type Route } from '../store';
import { Wordmark } from './Brand';
import { version } from '../../package.json';
import { today } from '../mock';
import { fmtDayMonth } from '../lib/dates';

/** package.json is 0.N.0 while this is a prototype: N is the crew app generation (v4). */
const GENERATION = `v${version.split('.')[1]}`;

const JUMPS: { label: string; route?: Route; note?: string; log?: boolean }[] = [
  { label: 'Dashboard', route: { name: 'dashboard' } },
  { label: 'Calendar', route: { name: 'calendar' } },
  { label: 'Documents', route: { name: 'documents' } },
  { label: 'Contacts', route: { name: 'contacts' } },
  { label: 'Settings', route: { name: 'settings' } },
  { label: 'Flight note', note: 'fl' },
  { label: 'Boarding pass', route: { name: 'ticket' } },
  { label: 'Ticket PDF', route: { name: 'pdf', file: 'Ticket_OS487.pdf' } },
  { label: 'Log sheet', log: true },
];

const ACCENTS: { value: NoteAccent; label: string; hint: string }[] = [
  { value: 'stub', label: 'Ticket stub', hint: 'Time column on the branded gradient' },
  { value: 'corner', label: 'Corner glow', hint: 'Lime light leak, top right' },
  { value: 'band', label: 'Header band', hint: 'Whole title row on the gradient' },
  { value: 'edge', label: 'Bottom edge', hint: 'Thin teal-to-lime line' },
  { value: 'none', label: 'None', hint: 'Plain cards' },
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
  const accent = useDemo((s) => s.noteAccent);
  const setAccent = useDemo((s) => s.setNoteAccent);
  const font = useDemo((s) => s.fontTheme);
  const setFont = useDemo((s) => s.setFontTheme);
  const openSheet = useDemo((s) => s.openSheet);

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
        <p className="dp-h">States</p>
        <Toggle label="Offline" hint="Amber banner with last sync" checked={offline} onChange={(v) => setFlag('offline', v)} />
        <Toggle label="Empty" hint="Nothing on the sheet yet" checked={empty} onChange={(v) => setFlag('empty', v)} />
        <Toggle label="No code in PDF" hint="Boarding pass fallback" checked={!codeFound} onChange={(v) => setFlag('codeFound', !v)} />
        <p className="dp-h">Smart note accent</p>
        <div className="dp-accents" role="radiogroup" aria-label="Smart note accent">
          {ACCENTS.map((a) => (
            <button type="button" key={a.value} role="radio" aria-checked={accent === a.value} className="dp-accent" onClick={() => setAccent(a.value)}>
              <span>{a.label}</span>
              <small>{a.hint}</small>
            </button>
          ))}
        </div>
        <p className="dp-h">Headline font</p>
        <div className="dp-accents" role="radiogroup" aria-label="Headline font">
          {FONT_THEMES.map((f) => (
            <button type="button" key={f.value} role="radio" aria-checked={font === f.value} className="dp-accent" onClick={() => setFont(f.value)}>
              <span>{f.label}</span>
              <small>{f.hint}</small>
            </button>
          ))}
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
