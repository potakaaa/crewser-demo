import type { Note } from '../mock';
import { Icon, type IconName } from './Icon';
import { Collapse } from './Layout';
import { chipStyle } from '../lib/noteStyle';
import { useNoteActions } from '../lib/actions';
import { cardSubtitle, cardTiles, dayStub, firstSentence, quickAction, timeSub, timeText, TYPE_LABEL, type CardTile } from '../lib/notes';

function FactTile({ tile }: { tile: CardTile }) {
  const a = useNoteActions();
  const icon: IconName | null = tile.action === 'map' ? 'nav' : tile.action === 'copy' ? 'copy' : tile.action === 'attachment' ? 'clip' : null;
  const onClick = () => {
    if (tile.unconfirmed) a.unconfirmed(tile.label);
    else if (tile.action === 'copy') a.copy(tile.value);
    else if (tile.action === 'map') a.map(tile.value);
    else if (tile.action === 'attachment') a.openPdf(tile.value);
    else a.copy(tile.value);
  };
  const aria = tile.unconfirmed
    ? `${tile.label}: not confirmed yet`
    : tile.action === 'map'
      ? `Open in maps: ${tile.value}`
      : tile.action === 'attachment'
        ? `Open: ${tile.value}`
        : `Copy ${tile.label}: ${tile.value}`;
  return (
    <button type="button" className={`tile${tile.unconfirmed ? ' tile-open' : ''}${tile.wide ? ' tile-wide' : ''}`} aria-label={aria} onClick={onClick}>
      <span className="tile-text">
        <span className="tile-k">{tile.label}</span>
        <span className="tile-v">{tile.value}</span>
      </span>
      {icon && <Icon name={icon} size={18} color="#2A3B3F" />}
    </button>
  );
}

/** A top smart note: header row, fact tiles, one-line note and an action. */
export function ContentCard({ note }: { note: Note }) {
  const a = useNoteActions();
  const text = firstSentence(note.text);
  const tiles = cardTiles(note);
  const pa = note.primaryAction;
  return (
    <article className="ccard">
      <button type="button" className="ccard-head" onClick={() => a.openNote(note.id)} aria-label={`${note.title}, ${dayStub(note)} ${timeText(note)}. Open details`}>
        <span className="stub">
          <span className="stub-time">{timeText(note)}</span>
          <span className="stub-sub">{dayStub(note)}</span>
        </span>
        <span className="chip-icon" style={chipStyle(note.type)}>
          <Icon name={note.type} size={18} />
        </span>
        <span className="row-titles">
          <span className="row-t1 row-t1-lg">{note.title}</span>
          <span className="row-t2">{cardSubtitle(note)}</span>
        </span>
        <Icon name="right" size={18} color="#54686C" />
      </button>
      <div className="ccard-body">
        <div className="tiles">
          {tiles.map((t) => (
            <FactTile key={t.key} tile={t} />
          ))}
        </div>
        {text && <p className="ccard-note">{text}</p>}
        {pa && (
          <button type="button" className="btn btn-ink" onClick={() => a.primary(note)}>
            <Icon name={pa.kind === 'boardingPass' ? 'ticket' : 'nav'} size={16} color="#FFFFFF" strokeWidth={1.8} />
            {pa.label}
          </button>
        )}
      </div>
    </article>
  );
}

/** Compact, tap-to-expand note row used in the full list and the calendar. */
export function NoteRow({ note, open, onToggle, withPrimary }: { note: Note; open: boolean; onToggle: () => void; withPrimary?: boolean }) {
  const a = useNoteActions();
  const q = quickAction(note);
  const bodyId = `row-${note.id}-${withPrimary ? 'cal' : 'home'}`;
  const pa = note.primaryAction;
  return (
    <div className={`nrow${note.kind === 'undated' ? ' nrow-dashed' : ''}`}>
      <div className="nrow-top">
        <button type="button" className="nrow-toggle" aria-expanded={open} aria-controls={bodyId} onClick={onToggle}>
          <span className="stub">
            <span className={`stub-time${note.kind === 'time' ? '' : ' stub-time-sm'}${note.kind === 'undated' ? ' stub-muted' : ''}`}>{timeText(note)}</span>
            <span className="stub-sub">{timeSub(note)}</span>
          </span>
          <span className="chip-icon" style={chipStyle(note.type)}>
            <Icon name={note.type} size={18} />
          </span>
          <span className="row-titles">
            <span className={`row-t1${note.type === 'flight' ? ' row-t1-route' : ''}`}>{note.title}</span>
            <span className="row-t2">
              {TYPE_LABEL[note.type]} · {note.subtitle}
            </span>
          </span>
          <span className="chev" data-open={open}>
            <Icon name="down" size={18} color="#54686C" />
          </span>
        </button>
        {q && (
          <button
            type="button"
            className="nrow-quick"
            aria-label={q === 'ticket' ? 'Show boarding pass' : `Open attachment ${note.attachments[0].file}`}
            onClick={() => a.quick(note)}
          >
            <Icon name={q === 'ticket' ? 'ticket' : 'clip'} size={20} color="#111A1B" />
            <span>{q === 'ticket' ? 'Ticket' : 'PDF'}</span>
          </button>
        )}
      </div>
      <Collapse open={open} id={bodyId}>
        <div className="nrow-body">
          {note.facts.slice(0, 3).map((f) => (
            <div className="nrow-fact" key={f.label}>
              <span className="tile-k">{f.label}</span>
              <span className={`nrow-fv${f.unconfirmed ? ' muted' : ''}`}>{f.value}</span>
            </div>
          ))}
          {!note.facts.length && note.text && <p className="nrow-text">{note.text}</p>}
          <div className="btn-row">
            <button type="button" className="btn btn-soft" onClick={() => a.openNote(note.id)}>
              {withPrimary ? 'Details' : 'Open details'}
            </button>
            {withPrimary && pa && (
              <button type="button" className="btn btn-ink btn-grow" onClick={() => a.primary(note)}>
                <Icon name={pa.kind === 'boardingPass' ? 'ticket' : 'nav'} size={16} color="#FFFFFF" strokeWidth={1.8} />
                {pa.short}
              </button>
            )}
          </div>
        </div>
      </Collapse>
    </div>
  );
}
