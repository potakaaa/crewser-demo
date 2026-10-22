import { docs, today, type Note } from '../mock';
import { useDemo } from '../store';
import { Icon } from './Icon';
import { useNoteActions } from '../lib/actions';
import { addDays, fmtCountdown } from '../lib/dates';
import { minutesUntil } from '../lib/notes';

const callSheetFor = (day: string) => docs.find((d) => d.kind === 'callsheet' && d.day === day);

/** "Call sheet · Shoot day 7" without the repeated "Call sheet". */
const shortTitle = (title: string) => title.replace(/^Call sheet · /, '');

/**
 * The one card for the day: when to be where, today's call sheet, and Submit hours.
 * Submit hours sits here because the end of the day is the one moment nobody can plan for.
 */
export function TodayCard({ note }: { note: Note | undefined }) {
  const a = useNoteActions();
  const setLogOpen = useDemo((s) => s.setLogOpen);
  const submitted = useDemo((s) => s.submitted.includes(today.date));
  const sheet = callSheetFor(today.date);
  const tomorrow = callSheetFor(addDays(today.date, 1));
  const wrap = note?.facts.find((f) => f.label === 'Wrap' && !f.unconfirmed)?.value;
  const place = note?.facts.find((f) => f.action === 'map')?.value ?? note?.subtitle;
  const minutes = note ? minutesUntil(note) : Infinity;

  return (
    <div className="today-card">
      {note ? (
        <>
          <div className="today-top">
            <span className="chip-lime">TODAY</span>
            <span className="today-meta">
              Shoot day {today.shootDay}
              {minutes > 0 && minutes !== Infinity ? ` · ${fmtCountdown(minutes)}` : ''}
            </span>
            <span className="spacer" />
            <button type="button" className="icon-btn icon-btn-soft today-arrow" aria-label="Open details" onClick={() => a.openNote(note.id)}>
              <Icon name="arrowUpRight" size={18} color="#111A1B" strokeWidth={1.8} />
            </button>
          </div>
          <div className="today-main">
            <span className="today-time num">{note.time}</span>
            <span className="today-titles">
              <span className="today-t1">{note.title}</span>
              <span className="today-t2">Call{wrap ? ` · wrap ${wrap}` : ' · wrap to be confirmed'}</span>
            </span>
          </div>
          {place && (
            <div className="today-pin">
              <Icon name="pin" size={16} color="#3F5155" />
              <span className="today-place">{place}</span>
              <button type="button" className="icon-btn icon-btn-chip copy-btn copy-btn-sm" aria-label={`Copy address: ${place}`} onClick={() => a.copy(place)}>
                <Icon name="copy" size={17} color="#111A1B" />
              </button>
              <button type="button" className="icon-btn icon-btn-chip copy-btn copy-btn-sm" aria-label={`Directions to ${place}`} onClick={a.directions}>
                <Icon name="nav" size={17} color="#111A1B" />
              </button>
            </div>
          )}
          {sheet && (
            <button type="button" className="btn btn-soft btn-md today-sheet" onClick={() => a.openPdf(sheet.file)}>
              <Icon name="file" size={18} color="#111A1B" strokeWidth={1.8} />
              Call sheet · {shortTitle(sheet.title)}
            </button>
          )}
          {tomorrow && (
            <button type="button" className="today-tmrw" onClick={() => a.openPdf(tomorrow.file)}>
              <span className="today-dot" aria-hidden="true" />
              <span>Tomorrow's call sheet is out</span>
              <strong>Open</strong>
            </button>
          )}
        </>
      ) : (
        <div className="today-empty">
          <span className="empty-icon">
            <Icon name="calendar" size={24} color="#2A3B3F" />
          </span>
          <strong>Nothing on your sheet yet</strong>
          <span>When production sends the call sheet or travel info, it shows up here.</span>
        </div>
      )}

      {submitted ? (
        <div className="today-done" role="status">
          <span className="today-done-icon">
            <Icon name="check" size={20} color="#2B3300" strokeWidth={2} />
          </span>
          <span className="today-done-text">
            <strong>Hours submitted</strong>
            <span>Production will approve them.</span>
          </span>
          <button type="button" className="link-btn" onClick={() => setLogOpen(true)}>
            Review
          </button>
        </div>
      ) : (
        <button type="button" className="btn btn-lime btn-xl today-submit" onClick={() => setLogOpen(true)}>
          <Icon name="logTime" size={20} color="#111A1B" strokeWidth={1.8} />
          Submit hours
        </button>
      )}
    </div>
  );
}
