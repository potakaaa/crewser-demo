import { noteById } from '../../mock';
import { Icon } from '../Icon';
import { TYPE_COLOR } from '../../lib/noteStyle';
import { useNoteActions } from '../../lib/actions';
import { FactActions } from '../NoteCards';
import { QrPreview } from '../QrPreview';
import { CrewSection } from '../CrewStack';
import { hasScanCode, timeSub, timeText, TYPE_LABEL, whenLabel } from '../../lib/notes';

/** Sheet title and subtitle for a note, used by SheetHost. A note without a date is General info and says nothing about dates. */
export function noteSheetMeta(id?: string) {
  const note = id ? noteById(id) : undefined;
  if (note && !note.day) return { title: 'General info', subtitle: undefined };
  return { title: note ? TYPE_LABEL[note.type] : 'Note', subtitle: note ? whenLabel(note) : undefined };
}

/** A smart note in full: hero (title, call and wrap), facts, its own action, the note text, attachments, who it is shared with. */
export function NoteSheet({ id }: { id?: string }) {
  const note = id ? noteById(id) : undefined;
  const a = useNoteActions();
  if (!note) return <p className="sheet-empty">This note is no longer available.</p>;
  const isFlight = note.type === 'flight' && !!note.route;
  const pa = note.primaryAction;
  const flightNo = note.facts.find((f) => f.label === 'Flight no.')?.value;
  // The hero shows call and wrap, or the time with its note ("15:00 Check-in"); a flight's number is in the pair under it.
  // The facts list does not repeat any of those (the sheet's subtitle already gives the date).
  const wrap = note.facts.find((f) => f.label === 'Wrap');
  const atTime = (value: string) => !!note.time && value.endsWith(note.time);
  const inHero = (label: string, value: string) =>
    isFlight
      ? label === 'Flight no.'
      : (label === 'Call' && value === note.time) || (label === 'Wrap' && !!wrap) || (!wrap && label === timeSub(note) && atTime(value));
  const facts = note.facts.filter((f) => !inHero(f.label, f.value));
  // With its own Directions button below, a place only needs Copy here.
  const directionsBelow = !!pa && pa.kind !== 'boardingPass';

  return (
    <>
      <div className="ns-hero">
        <div className="ns-hero-head">
          <span className="chip-icon chip-icon-glass">
            <Icon name={note.type} size={18} color={TYPE_COLOR[note.type].dot} />
          </span>
          {!isFlight && <h3 className="ns-title">{note.title}</h3>}
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
          note.day && (
            <div className="ns-times">
              <span className="ns-time">
                <span className="ns-k">{wrap ? 'Call' : note.kind === 'time' ? 'Time' : 'When'}</span>
                <span className="ns-big">{timeText(note)}</span>
                {!wrap && timeSub(note) && <span className="ns-sub">{timeSub(note)}</span>}
              </span>
              {wrap && (
                <span className="ns-time">
                  <span className="ns-k">Wrap</span>
                  <span className={wrap.unconfirmed ? 'ns-tbc' : 'ns-big'}>{wrap.value}</span>
                </span>
              )}
            </div>
          )
        )}
      </div>

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
      {hasScanCode(note) && <QrPreview note={note} />}
      {facts.length > 0 && (
        <div className="facts-card">
          {facts.map((f) => (
            <div className="fact-row" key={f.label}>
              <span className="fact-text">
                <span className="tile-k">{f.label}</span>
                <span className={`fact-v${f.unconfirmed ? ' muted' : ''}`}>{f.value}</span>
              </span>
              <FactActions fact={directionsBelow && f.action === 'map' ? { ...f, action: 'copy' } : f} />
            </div>
          ))}
        </div>
      )}
      {pa && (
        <button type="button" className="btn btn-primary btn-lg" onClick={() => a.primary(note)}>
          <Icon name={pa.kind === 'boardingPass' ? 'ticket' : 'nav'} size={18} color="#FFFFFF" strokeWidth={1.8} />
          {pa.label}
        </button>
      )}
      {note.text && (
        <div className="ns-callout">
          <span className="ns-callout-k">Note</span>
          <p>{note.text}</p>
        </div>
      )}
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
      <div className="crew-card">
        <span className="crew-card-k">Shared with</span>
        <CrewSection note={note} />
      </div>
      {note.source && (
        <div className="crew-line">
          <Icon name="calendar" size={16} color="#54686C" />
          <span>From {note.source}</span>
        </div>
      )}
    </>
  );
}
