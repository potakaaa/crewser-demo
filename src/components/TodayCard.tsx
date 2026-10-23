import { useEffect, useRef, useState, type ReactNode } from 'react';
import { today, type Note } from '../mock';
import { useDemo } from '../store';
import { Icon } from './Icon';
import { useNoteActions } from '../lib/actions';
import { fmtCountdown, fmtDayShort, toMinutes } from '../lib/dates';
import { useSubmitted } from '../lib/useSubmitted';
import { quickAction, TYPE_LABEL } from '../lib/notes';
import { phaseOf, wrapMinutes, wrapOf, type Phase } from '../lib/todayPhase';
import { NotePrimaryAction } from './NotePrimaryAction';
import { previewLine, type Preview, type Scrub } from '../lib/timeline';

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
  note: Note;
}

function heroUrgent(n: Note, phase: Phase, sent: 'sent' | 'saved' | null): Urgent {
  const wrap = wrapOf(n);
  const wrapMin = wrapMinutes(n);
  const now = toMinutes(today.time);
  let meta: string;
  if (sent) {
    // The day is handled: no countdown or "on set" any more.
    meta = sent === 'saved' ? 'Saved on this phone' : 'Hours sent';
  } else if (phase === 'before') {
    const countdown = fmtCountdown(toMinutes(n.time!) - now);
    meta = wrap ? `${countdown} · wrap ${wrap}` : `${countdown} · wrap to be confirmed`;
  } else if (phase === 'during') {
    meta = wrapMin !== null ? `On set · wrap ${fmtCountdown(wrapMin - now)}` : 'On set · wrap to be confirmed';
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
    note: n,
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
    note: n,
  };
}

function UrgentBody({ u }: { u: Urgent }) {
  const a = useNoteActions();
  const note = u.note;
  // The note's own action, as on its card below; a note with only an attachment opens that.
  const attachment = !note.primaryAction && quickAction(note);
  return (
    <div className="today-urgent">
      <button type="button" className="today-main" data-hero={u.tone === 'lime'} onClick={() => a.openNote(note.id)} aria-label={`${u.time ? `${u.time}, ` : ''}${u.title}. Open details`}>
        {u.time && <span className={`today-time num${u.timeSmall ? ' today-time-sm' : ''}`}>{u.time}</span>}
        <span className="today-titles">
          <span className="today-t1">{u.title}</span>
          {u.sub && <span className="today-t2">{u.sub}</span>}
        </span>
        <Icon name="right" size={18} color="#54686C" />
      </button>
      <NotePrimaryAction note={note} className="today-action" />
      {attachment && (
        <button type="button" className="btn btn-outline today-action" onClick={() => a.quick(note)}>
          <Icon name="clip" size={16} color="#111A1B" strokeWidth={1.8} />
          Open
        </button>
      )}
    </div>
  );
}

function NothingToday() {
  return (
    <div className="today-urgent">
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
 * The top card: the smart note the ruler's playhead is on (today's call at rest), with that note's own action.
 * Call sheet and Submit hours live in the TodayBar below, which never changes while you scrub.
 */
export function TodayCard({ hero, scrub, preview, onBack }: { hero: Note | undefined; scrub: Scrub; preview: Preview | null; onBack: () => void }) {
  const submitted = useSubmitted().includes(today.date);
  const offline = useDemo((s) => s.offline);
  const phase = phaseOf(hero);

  let key: string;
  let body: ReactNode;
  // The tag and meta of what the card shows at rest; while previewing, the Preview line takes their place.
  let tag = 'TODAY';
  let tone: Urgent['tone'] | undefined;
  let meta = `Shoot day ${today.shootDay}`;
  // A preview from the ruler before this one (Empty was toggled) can point past the stops for one render.
  const stop = preview ? scrub.stops[preview.index] : undefined;
  if (preview && stop) {
    key = `stop-${preview.index}`;
    body = <UrgentBody u={stopUrgent(stop.note, preview.index)} />;
  } else if (hero) {
    const u = heroUrgent(hero, phase, submitted ? (offline ? 'saved' : 'sent') : null);
    key = u.key;
    ({ tag, tone, meta } = u);
    body = <UrgentBody u={u} />;
  } else {
    key = 'empty';
    body = <NothingToday />;
  }

  return (
    <div className="today-card">
      <div className="today-top">
        {preview && stop ? (
          <>
            <span className="today-preview">{previewLine(scrub, preview)}</span>
            <button type="button" className="pill-btn" onClick={onBack}>
              Back to now
            </button>
          </>
        ) : (
          <>
            <span className="today-tag" data-tone={tone}>{tag}</span>
            <span className="today-meta">{meta}</span>
          </>
        )}
      </div>
      <Crossfade id={key}>{body}</Crossfade>
    </div>
  );
}
