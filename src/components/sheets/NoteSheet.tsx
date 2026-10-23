import { noteById, type InfoContact, type NoteInfo } from '../../mock';
import { Icon } from '../Icon';
import { TYPE_COLOR } from '../../lib/noteStyle';
import { useNoteActions } from '../../lib/actions';
import { fmtDayMonth } from '../../lib/dates';
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

const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`;
/** 112, 144, 133: the short public emergency numbers, shown as three call tiles above the rest. */
const isEmergency = (c: InfoContact) => /^\d{3}$/.test(c.phone);
/** Where a tile's number works, in two words; the full note is in its label for screen readers. */
const sosReach = (note?: string) => (!note ? undefined : /austria only/i.test(note) ? 'AT only' : /\bEU\b/.test(note) ? 'EU-wide' : undefined);
const contactKey = (c: InfoContact) => `${c.label}:${c.phone}`;

/** Contacts, office hours and address of a General info note: call or copy a number, copy or open the address. */
function InfoBlocks({ info }: { info: NoteInfo }) {
  const a = useNoteActions();
  const sos = info.contacts?.filter(isEmergency) ?? [];
  const contacts = info.contacts?.filter((c) => !isEmergency(c)) ?? [];
  return (
    <>
      {sos.length > 0 && (
        <div className="ns-sos" role="group" aria-label="Emergency numbers">
          {sos.map((c) => (
            <a key={contactKey(c)} className="ns-sos-btn" href={telHref(c.phone)} aria-label={`Call ${c.label}, ${c.phone}${c.note ? `, ${c.note}` : ''}`}>
              <span className="ns-sos-num">{c.phone}</span>
              <span className="ns-sos-k">{c.label}</span>
              {sosReach(c.note) && (
                <span className="ns-sos-note" aria-hidden="true">
                  {sosReach(c.note)}
                </span>
              )}
            </a>
          ))}
        </div>
      )}
      {contacts.length > 0 && (
        <section className="ns-block" aria-label="Contacts">
          <h4 className="ns-h">Contacts</h4>
          <ul className="ns-contacts">
            {contacts.map((c) => (
              <li className="ns-contact" key={contactKey(c)}>
                <span className="ns-contact-text">
                  <span className="ns-contact-k">{c.label}</span>
                  {c.name && <span className="ns-contact-name">{c.name}</span>}
                  <span className="ns-contact-phone">{c.phone}</span>
                  {c.note && <span className="ns-contact-note">{c.note}</span>}
                </span>
                <button type="button" className="icon-btn ns-copy" aria-label={`Copy ${c.label} number: ${c.phone}`} onClick={() => a.copy(c.phone)}>
                  <Icon name="copy" size={17} color="#2A3B3F" />
                </button>
                <a className="icon-btn ns-call" href={telHref(c.phone)} aria-label={`Call ${c.name ?? c.label}, ${c.phone}`}>
                  <Icon name="call" size={18} color="#FFFFFF" />
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
      {info.hours && info.hours.length > 0 && (
        <section className="ns-block" aria-label="Office hours">
          <h4 className="ns-h">Office hours</h4>
          <dl className="ns-hours">
            {info.hours.map((h) => (
              <div className="ns-hours-row" key={h.days}>
                <dt>{h.days}</dt>
                <dd>{h.time}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
      {info.address && (
        <section className="ns-block" aria-label="Address">
          <h4 className="ns-h">Address</h4>
          <div className="facts-card">
            <div className="fact-row">
              <span className="fact-text">
                <span className="fact-v">{info.address}</span>
              </span>
              <FactActions fact={{ label: 'Address', value: info.address, action: 'map' }} />
            </div>
          </div>
        </section>
      )}
    </>
  );
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
  // Only a dated note has the time block; an undated one keeps all its facts.
  const call = note.day ? note.facts.find((f) => f.label === 'Call') : undefined;
  const wrap = note.day ? note.facts.find((f) => f.label === 'Wrap') : undefined;
  // "Wed 21 Oct, 15:00": the note's own day and time, nothing the hero and subtitle don't already say.
  const atTime = (value: string) => !!note.day && !!note.time && value === `${fmtDayMonth(note.day)}, ${note.time}`;
  const inHero = (label: string, value: string) =>
    isFlight
      ? label === 'Flight no.'
      : (label === 'Call' && !!call) || (label === 'Wrap' && !!wrap) || (!wrap && label === timeSub(note) && atTime(value));
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
                <span className="ns-k">{call || wrap ? 'Call' : note.kind === 'time' ? 'Time' : 'When'}</span>
                <span className="ns-big">{call?.value ?? timeText(note)}</span>
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
      {note.info && <InfoBlocks info={note.info} />}
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
        // Production's note, labelled like gear on set: a strip of lime camera tape with marker writing.
        <div className="ns-note">
          <span className="ns-tape">
            Production<span className="sr-only"> note:</span>
          </span>
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
