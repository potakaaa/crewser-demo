import { today, type Note } from '../mock';
import { useDemo } from '../store';
import { Icon } from './Icon';
import { useNoteActions } from '../lib/actions';
import { addDays, fmtDayMonth } from '../lib/dates';
import { dayStat, shiftLabel } from '../lib/stats';
import { useSubmitted } from '../lib/useSubmitted';
import { callSheetFor, phaseOf } from '../lib/todayPhase';

/** "Call sheet · Shoot day 7" without the repeated "Call sheet". */
const shortTitle = (title: string) => title.replace(/^Call sheet · /, '');

/**
 * Today's two end-of-day actions, under the top card: the call sheet and Submit hours.
 * It sits outside the card on purpose: the card follows the ruler, this bar never changes while you scrub.
 */
export function TodayBar({ hero }: { hero: Note | undefined }) {
  const a = useNoteActions();
  const setLogOpen = useDemo((s) => s.setLogOpen);
  const submitted = useSubmitted().includes(today.date);
  const offline = useDemo((s) => s.offline);
  const start = useDemo((s) => s.logStart);
  const end = useDemo((s) => s.logEnd);
  const breakMin = useDemo((s) => s.breakMin);
  const phase = phaseOf(hero);
  // What was sent: today's shift as the Log sheet holds it (editing it after sending un-sends the day).
  const sent = submitted && end ? dayStat(today.date, { date: today.date, kind: 'shoot', start, end, breakMin, status: 'submitted' }) : null;
  const sheet = callSheetFor(today.date);
  const tomorrow = callSheetFor(addDays(today.date, 1));

  return (
    <div className="today-bar">
      {/* Always in the page, so a screen reader hears the change when it fills. */}
      <p className="sr-only" role="status">
        {submitted ? (offline ? "Saved on this phone, sends when you're online." : sent ? `Hours sent: ${shiftLabel(sent).replace(' · ', ', ')}.` : 'Hours sent.') : ''}
      </p>

      <div className="today-actions">
        {sheet && (
          <button type="button" className="btn today-seg today-sheet" onClick={() => a.openPdf(sheet.file)}>
            <Icon name="file" size={18} color="#111A1B" strokeWidth={1.8} />
            Call sheet
            <span className="today-sheet-day">{shortTitle(sheet.title).replace('Shoot day ', 'Day ')}</span>
          </button>
        )}
        {submitted ? (
          <div className="today-sent">
            <button
              type="button"
              className="btn today-seg today-sent-btn"
              onClick={() => setLogOpen(true)}
              aria-label={sent ? `${offline ? 'Saved on this phone' : 'Sent'}: ${fmtDayMonth(today.date)}, ${shiftLabel(sent).replace(' · ', ', ')}. Review` : 'Hours submitted. Review'}
            >
              <Icon name="check" size={18} color="#2B3300" strokeWidth={2.2} />
              <span className="today-sent-text">
                <strong>{offline ? 'Saved on phone' : 'Sent'}</strong>
                {offline ? <span>Sends when online</span> : sent && <span>{shiftLabel(sent)}</span>}
              </span>
            </button>
          </div>
        ) : (
          <button type="button" className={`btn today-seg today-submit${phase === 'after' ? ' btn-lime' : ''}`} onClick={() => setLogOpen(true)}>
            <Icon name="logTime" size={18} color="#111A1B" strokeWidth={1.8} />
            Submit hours
          </button>
        )}
      </div>

      {tomorrow && (
        <div className="today-bar-foot">
          <button type="button" className="today-tmrw" onClick={() => a.openPdf(tomorrow.file)}>
            <span className="today-dot" aria-hidden="true" />
            <span>Tomorrow's call sheet is out</span>
            <strong>Open</strong>
          </button>
        </div>
      )}
    </div>
  );
}
