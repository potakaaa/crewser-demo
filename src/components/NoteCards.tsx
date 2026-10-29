import type { Fact, Note } from '../mock';
import { Icon } from './Icon';
import { NotePrimaryAction } from './NotePrimaryAction';
import { chipStyle } from '../lib/noteStyle';
import { useNoteActions } from '../lib/actions';
import { cardSubtitle, cardTiles, dayStub, timeText } from '../lib/notes';

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
          <Icon name="copy" size={17} color="currentColor" />
        </button>
      )}
      {fact.action === 'map' && (
        <button type="button" className={`icon-btn icon-btn-chip copy-btn copy-btn-${size}`} aria-label={`Open in maps: ${fact.value}`} onClick={() => a.map(fact.value)}>
          <Icon name="nav" size={17} color="currentColor" />
        </button>
      )}
    </span>
  );
}

/**
 * The one smart note card, on Home and in the Calendar: the header row, the two facts you most
 * often act on, and one action. The rest (QR code, note text, crew) is one tap away in the sheet.
 */
export function ContentCard({ note }: { note: Note }) {
  const a = useNoteActions();
  const tiles = cardTiles(note);
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
        <Icon name="right" size={18} color="#9AAAAC" />
      </button>
      {(tiles.length > 0 || note.primaryAction) && (
        <div className="ccard-body">
          {tiles.length > 0 && (
            <p className="ccard-facts">
              {tiles.map((t) => (
                <span className="ccard-fact" key={t.key}>
                  <span className="ccard-fact-k">{t.label}</span>{' '}
                  {isCopyable(t) ? (
                    // The values worth copying (flight number, booking code, addresses) copy in one tap, without opening the note.
                    <button
                      type="button"
                      className="ccard-fact-copy"
                      aria-label={`Copy ${t.label}: ${t.value}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        a.copy(t.value);
                      }}
                    >
                      <span className="ccard-fact-v">{t.value}</span>
                      <Icon name="copy" size={13} color="#9AAAAC" strokeWidth={1.8} />
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
