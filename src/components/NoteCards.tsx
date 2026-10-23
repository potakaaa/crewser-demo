import type { Fact, Note } from '../mock';
import { Icon } from './Icon';
import { Collapse } from './Layout';
import { QrPreview } from './QrPreview';
import { CrewSection } from './CrewStack';
import { NotePrimaryAction } from './NotePrimaryAction';
import { chipStyle } from '../lib/noteStyle';
import { useNoteActions } from '../lib/actions';
import { cardSubtitle, cardTiles, dayStub, hasScanCode, quickAction, timeSub, timeText, TYPE_LABEL } from '../lib/notes';

/** Codes and addresses are worth copying; "to be confirmed" is not. */
export const isCopyable = (f: Pick<Fact, 'action' | 'unconfirmed'>) => !f.unconfirmed && (f.action === 'copy' || f.action === 'map');

/** Small trailing icon buttons for one fact: copy, and open in maps for places. */
export function FactActions({ fact, size = 'md' }: { fact: Fact; size?: 'sm' | 'md' }) {
  const a = useNoteActions();
  if (fact.unconfirmed || !fact.action) return null;
  return (
    <span className="fact-actions">
      {isCopyable(fact) && (
        <button type="button" className={`icon-btn icon-btn-chip copy-btn copy-btn-${size}`} aria-label={`Copy ${fact.label}: ${fact.value}`} onClick={() => a.copy(fact.value)}>
          <Icon name="copy" size={17} color="#111A1B" />
        </button>
      )}
      {fact.action === 'map' && (
        <button type="button" className={`icon-btn icon-btn-chip copy-btn copy-btn-${size}`} aria-label={`Open in maps: ${fact.value}`} onClick={() => a.map(fact.value)}>
          <Icon name="nav" size={17} color="#111A1B" />
        </button>
      )}
    </span>
  );
}

/**
 * A top smart note, kept short so a few fit on a screen: the header row, the two facts you
 * most often act on, and one action. The rest (QR code, note text, crew) is one tap away in the sheet.
 */
export function ContentCard({ note }: { note: Note }) {
  const a = useNoteActions();
  const tiles = cardTiles(note).slice(0, 2);
  return (
    <article className="ccard ccard-compact">
      <button type="button" className="ccard-head" onClick={() => a.openNote(note.id)} aria-label={`${note.title}, ${cardSubtitle(note)}, ${dayStub(note)} ${timeText(note)}. Open details`}>
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
      {(tiles.length > 0 || note.primaryAction) && (
        <div className="ccard-body">
          {tiles.length > 0 && (
            <p className="ccard-facts">
              {tiles.map((t) => (
                <span className="ccard-fact" key={t.key}>
                  <span className="ccard-fact-k">{t.label}</span>{' '}
                  {t.action !== 'attachment' && isCopyable({ action: t.action, unconfirmed: t.unconfirmed }) ? (
                    // The values worth copying (flight number, booking code, addresses) copy in one tap, without opening the note.
                    <button
                      type="button"
                      className="ccard-fact-copy"
                      aria-label={`Copy ${t.label.toLowerCase()} ${t.value}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        a.copy(t.value);
                      }}
                    >
                      <span className="ccard-fact-v">{t.value}</span>
                      <Icon name="copy" size={13} color="#54686C" strokeWidth={1.8} />
                    </button>
                  ) : (
                    <span className={`ccard-fact-v${t.unconfirmed ? ' muted' : ''}`}>{t.value}</span>
                  )}
                </span>
              ))}
            </p>
          )}
          <NotePrimaryAction note={note} />
        </div>
      )}
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
              {/* The coloured chip already says the type; keep it for screen readers. */}
              <span className="sr-only">{TYPE_LABEL[note.type]} · </span>
              {note.subtitle}
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
          {hasScanCode(note) && <QrPreview note={note} />}
          {note.facts.map((f) => (
            <div className="nrow-fact" key={f.label}>
              <span className="nrow-fact-text">
                <span className="tile-k">{f.label}</span>
                <span className={`nrow-fv${f.unconfirmed ? ' muted' : ''}`}>{f.value}</span>
              </span>
              <FactActions fact={f} size="sm" />
            </div>
          ))}
          {!note.facts.length && note.text && <p className="nrow-text">{note.text}</p>}
          <CrewSection note={note} />
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
