import { useEffect, useRef, useState, type ReactNode } from 'react';
import { docs, today, type Note } from '../mock';
import { useDemo } from '../store';
import { Icon } from './Icon';
import { useNoteActions } from '../lib/actions';
import { addDays, fmtCountdown, fmtDayMonth, fmtDayShort, toMinutes } from '../lib/dates';
import { dayStat, shiftLabel } from '../lib/stats';
import { useSubmitted } from '../lib/useSubmitted';
import { TYPE_LABEL } from '../lib/notes';
import { previewLine, type Preview, type Scrub } from '../lib/timeline';

const callSheetFor = (day: string) => docs.find((d) => d.kind === 'callsheet' && d.day === day);

/** "Call sheet · Shoot day 7" without the repeated "Call sheet". */
const shortTitle = (title: string) => title.replace(/^Call sheet · /, '');

/** Fade time of the swap, in ms; matches `.xf-in` / `.xf-out` in dashboard.css. */
const FADE_MS = 180;

/** Cross-fades between versions of `children` when `id` changes. The old one fades out on top while the new one fades in. */
function Crossfade({ id, children }: { id: string; children: ReactNode }) {
  const [seen, setSeen] = useState(id);
  const [leaving, setLeaving] = useState<{ id: string; node: ReactNode } | null>(null);
  const last = useRef<ReactNode>(children);
  if (seen !== id) {
    setSeen(id);
    setLeaving({ id: seen, node: last.current });
  }
  useEffect(() => {
    last.current = children;
  });
  useEffect(() => {
    if (!leaving) return;
    const t = window.setTimeout(() => setLeaving(null), FADE_MS + 40);
    return () => window.clearTimeout(t);
  }, [leaving]);
  return (
    <div className="xf">
      <div className="xf-in" key={id}>
        {children}
      </div>
      {leaving && (
        <div className="xf-out" key={`out-${leaving.id}`} aria-hidden="true" inert>
          {leaving.node}
        </div>
      )}
    </div>
  );
}

/** What the swappable top part of the card shows. */
interface Urgent {
  key: string;
  tag: string;
  tone: 'lime' | 'soft';
  meta: string;
  time?: string;
  /** All-day notes have no clock time; the label is smaller. */
  timeSmall?: boolean;
  title: string;
  sub?: string;
  place?: string;
  noteId?: string;
}

const placeOf = (n: Note) => n.facts.find((f) => f.action === 'map')?.value;

/** Where today's shift stands, by the app's clock: before the call, on set, or after wrap. */
type Phase = 'before' | 'during' | 'after';

const wrapOf = (n: Note) => n.facts.find((f) => f.label === 'Wrap' && !f.unconfirmed)?.value;

function phaseOf(n: Note | undefined): Phase {
  const now = toMinutes(today.time);
  if (!n?.time || now < toMinutes(n.time)) return 'before';
  const wrap = wrapOf(n);
  return wrap && now >= toMinutes(wrap) ? 'after' : 'during';
}

function heroUrgent(n: Note, phase: Phase): Urgent {
  const wrap = wrapOf(n);
  const now = toMinutes(today.time);
  let meta: string;
  if (phase === 'before') {
    const countdown = fmtCountdown(toMinutes(n.time!) - now);
    meta = wrap ? `${countdown} · wrap ${wrap}` : `${countdown} · wrap to be confirmed`;
  } else if (phase === 'during') {
    meta = wrap ? `On set · wrap ${fmtCountdown(toMinutes(wrap) - now)}` : 'On set · wrap to be confirmed';
  } else {
    meta = `Wrapped at ${wrap}`;
  }
  return {
    key: `hero-${n.id}`,
    tag: 'TODAY',
    tone: 'lime',
    meta,
    time: n.time,
    title: n.title,
    sub: n.subtitle,
    place: placeOf(n) ?? n.subtitle,
    noteId: n.id,
  };
}

function stopUrgent(n: Note, index: number): Urgent {
  return {
    key: `stop-${index}`,
    tag: n.day === today.date ? 'TODAY' : fmtDayShort(n.day!).toUpperCase(),
    tone: 'soft',
    meta: TYPE_LABEL[n.type],
    time: n.kind === 'time' ? n.time : 'All day',
    timeSmall: n.kind !== 'time',
    title: n.title,
    sub: n.subtitle,
    place: placeOf(n),
    noteId: n.id,
  };
}

function UrgentBody({ u }: { u: Urgent }) {
  const a = useNoteActions();
  const place = u.place;
  return (
    <div className="today-urgent">
      <div className="today-top">
        <span className={u.tone === 'lime' ? 'chip-lime' : 'chip-quiet'}>{u.tag}</span>
        <span className="today-meta">{u.meta}</span>
        <span className="spacer" />
        {place && u.tone === 'lime' && (
          <button type="button" className="icon-btn icon-btn-chip today-ib" aria-label={`Directions to ${place}`} onClick={a.directions}>
            <Icon name="nav" size={17} color="#111A1B" />
          </button>
        )}
      </div>
      <button type="button" className="today-main" data-hero={u.tone === 'lime'} onClick={() => u.noteId && a.openNote(u.noteId)} aria-label={`${u.time ? `${u.time}, ` : ''}${u.title}. Open details`}>
        {u.time && <span className={`today-time num${u.timeSmall ? ' today-time-sm' : ''}`}>{u.time}</span>}
        <span className="today-titles">
          <span className="today-t1">{u.title}</span>
          {u.sub && <span className="today-t2">{u.sub}</span>}
        </span>
        <Icon name="right" size={18} color="#54686C" />
      </button>
    </div>
  );
}

function NothingLeft() {
  return (
    <div className="today-urgent">
      <div className="today-top">
        <span className="chip-quiet">ALL CLEAR</span>
      </div>
      <div className="today-main today-main-empty">
        <span className="today-titles">
          <span className="today-t1">Nothing else scheduled</span>
          <span className="today-t2">Production has not sent anything after this.</span>
        </span>
      </div>
    </div>
  );
}

function NothingToday() {
  return (
    <div className="today-urgent">
      <div className="today-top">
        <span className="chip-quiet">TODAY</span>
        <span className="today-meta">Shoot day {today.shootDay}</span>
      </div>
      <div className="today-main today-main-empty">
        <span className="today-titles">
          <span className="today-t1">Nothing on your sheet yet</span>
          <span className="today-t2">Call times and travel from production show up here.</span>
        </span>
      </div>
    </div>
  );
}

/**
 * The one card for the day: when to be where, today's call sheet, and Submit hours.
 * The top part is the note the ruler's playhead is on (today's call at rest). The call sheet and
 * Submit hours row below never changes, so the end of the day is one tap away while you look ahead.
 */
export function TodayCard({ hero, scrub, preview, onBack }: { hero: Note | undefined; scrub: Scrub; preview: Preview | null; onBack: () => void }) {
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

  let key: string;
  let body: ReactNode;
  if (preview) {
    const stop = scrub.stops[preview.index];
    key = stop ? `stop-${preview.index}` : 'none';
    body = stop ? <UrgentBody u={stopUrgent(stop.note, preview.index)} /> : <NothingLeft />;
  } else if (hero) {
    const u = heroUrgent(hero, phase);
    key = u.key;
    body = <UrgentBody u={u} />;
  } else {
    key = 'empty';
    body = <NothingToday />;
  }

  return (
    <div className="today-card">
      <Crossfade id={key}>{body}</Crossfade>
      <div className="today-line">
        {preview ? (
          <>
            <span className="today-preview">{previewLine(scrub, preview)}</span>
            <button type="button" className="pill-btn" onClick={onBack}>
              Back to now
            </button>
          </>
        ) : submitted && offline ? (
          <span className="today-hint" role="status">
            Saved on this phone, sends when you're online.
          </span>
        ) : tomorrow ? (
          <button type="button" className="today-tmrw" onClick={() => a.openPdf(tomorrow.file)}>
            <span className="today-dot" aria-hidden="true" />
            <span>Tomorrow's call sheet is out</span>
            <strong>Open</strong>
          </button>
        ) : (
          <span className="today-hint">Slide the ruler above to preview what is next.</span>
        )}
      </div>

      <div className="today-actions">
        {sheet && (
          <button type="button" className="btn btn-soft btn-md today-sheet" onClick={() => a.openPdf(sheet.file)}>
            <Icon name="file" size={18} color="#111A1B" strokeWidth={1.8} />
            Call sheet
            <span className="today-sheet-day">{shortTitle(sheet.title).replace('Shoot day ', 'Day ')}</span>
          </button>
        )}
        {submitted ? (
          <div className="today-sent">
            <button
              type="button"
              className="btn btn-md today-sent-btn"
              onClick={() => setLogOpen(true)}
              aria-label={sent ? `${offline ? 'Saved on this phone' : 'Sent'}: ${fmtDayMonth(today.date)}, ${shiftLabel(sent).replace(' · ', ', ')}. Review` : 'Hours submitted. Review'}
            >
              <Icon name="check" size={18} color="#2B3300" strokeWidth={2.2} />
              <span className="today-sent-text">
                <strong>{offline ? 'Saved' : 'Sent'}</strong>
                {sent && <span>{shiftLabel(sent)}</span>}
              </span>
            </button>
          </div>
        ) : (
          <button type="button" className={`btn btn-md today-submit ${phase === 'after' ? 'btn-lime' : 'btn-outline'}`} onClick={() => setLogOpen(true)}>
            <Icon name="logTime" size={18} color="#111A1B" strokeWidth={1.8} />
            Submit hours
          </button>
        )}
      </div>
    </div>
  );
}
