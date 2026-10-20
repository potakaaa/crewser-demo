import { noteById } from '../mock';
import { useDemo, usePrevRoute } from '../store';
import { Icon } from '../components/Icon';
import { Sheet } from '../components/Layout';
import { TYPE_COLOR } from '../lib/noteStyle';
import { useNoteActions } from '../lib/actions';
import { timeSub, timeText, TYPE_LABEL, whenLabel } from '../lib/notes';
import { useScrollRestore } from '../lib/scroll';

export function NoteDetailScreen({ id }: { id: string }) {
  const note = noteById(id)!;
  const ref = useScrollRestore<HTMLDivElement>(`note-${id}`, useDemo((s) => s.setStatusDark));
  const back = useDemo((s) => s.back);
  const prev = usePrevRoute();
  const a = useNoteActions();
  const backLabel = prev?.name === 'calendar' ? 'Calendar' : 'Home';
  const isFlight = note.type === 'flight' && !!note.route;
  const pa = note.primaryAction;
  const flightNo = note.facts.find((f) => f.label === 'Flight no.')?.value;

  return (
    <div className="screen screen-col">
      <div className="screen-scroll" ref={ref}>
        <div className="sat-band" aria-hidden="true" />
        <header className="gh grain gh-detail">
          <div className="detail-nav">
            <button type="button" className="glass-btn glass-btn-text back-btn" onClick={back}>
              <Icon name="left" size={20} color="#FFFFFF" />
              {backLabel}
            </button>
          </div>
          <div className="detail-type">
            <span className="chip-icon chip-icon-glass">
              <Icon name={note.type} size={18} color={TYPE_COLOR[note.type].dot} />
            </span>
            <span className="detail-type-text">
              <strong>{TYPE_LABEL[note.type]}</strong>
              <span>{whenLabel(note)}</span>
            </span>
          </div>
          {isFlight ? (
            <div className="route route-dark">
              <div>
                <span className="route-code">{note.route!.from.code}</span>
                <span className="route-city">{note.route!.from.city}</span>
              </div>
              <Icon name="arrowRight" size={26} color="#C4CFD0" className="route-arrow" />
              <div className="route-end">
                <span className="route-code">{note.route!.to.code}</span>
                <span className="route-city">{note.route!.to.city}</span>
              </div>
            </div>
          ) : (
            <div className="detail-hero">
              <div className="detail-hero-time">
                <span className="detail-big">{timeText(note)}</span>
                <span className="detail-sub">{timeSub(note)}</span>
              </div>
              <h1 className="detail-title">{note.title}</h1>
            </div>
          )}
        </header>

        <Sheet className="sheet-detail">
          {isFlight && <h1 className="sr-only">Flight {note.title}</h1>}
          {isFlight && (
            <div className="duo">
              <div className="duo-card">
                <span className="tile-k">Departs</span>
                <strong>{note.time}</strong>
              </div>
              <div className="duo-card">
                <span className="tile-k">Flight</span>
                <strong>{flightNo}</strong>
              </div>
            </div>
          )}
          {note.facts.length > 0 && (
            <div className="facts-card">
              {note.facts.map((f) => (
                <div className="fact-row" key={f.label}>
                  <span className="fact-text">
                    <span className="tile-k">{f.label}</span>
                    <span className={`fact-v${f.unconfirmed ? ' muted' : ''}`}>{f.value}</span>
                  </span>
                  {f.action && (
                    <button
                      type="button"
                      className="icon-btn icon-btn-chip"
                      aria-label={f.action === 'map' ? `Open in maps: ${f.value}` : `Copy ${f.label}: ${f.value}`}
                      onClick={() => (f.action === 'map' ? a.map(f.value) : a.copy(f.value))}
                    >
                      <Icon name={f.action === 'map' ? 'nav' : 'copy'} size={18} color="#111A1B" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
          {note.text && <p className="note-text">{note.text}</p>}
          {note.attachments.map((att) => (
            <button type="button" key={att.file} className="att-row" onClick={() => a.openPdf(att.file)}>
              <span className="todo-icon todo-icon-neutral">
                <Icon name="file" size={20} color="#2A3B3F" />
              </span>
              <span className="todo-titles">
                <span className="att-name">{att.file}</span>
                <span className="att-sub">{att.kind} · saved offline</span>
              </span>
              <span className="att-open">Open</span>
            </button>
          ))}
          <div className="crew-line">
            <Icon name="users" size={18} color="#54686C" />
            <span>{note.crew}</span>
            {note.source && <span className="source-chip">{note.source}</span>}
          </div>
        </Sheet>
      </div>
      <div className="sticky-foot">
        <button type="button" className="btn btn-soft btn-lg" onClick={back}>
          Close
        </button>
        {pa && (
          <button type="button" className="btn btn-ink btn-lg btn-grow2" onClick={() => a.primary(note)}>
            <Icon name={pa.kind === 'boardingPass' ? 'ticket' : 'nav'} size={18} color="#FFFFFF" strokeWidth={1.8} />
            {pa.label}
          </button>
        )}
      </div>
    </div>
  );
}
