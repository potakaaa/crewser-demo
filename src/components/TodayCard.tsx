import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import { today, type Note } from '../mock';
import { useDemo } from '../store';
import { Icon } from './Icon';
import { useNoteActions } from '../lib/actions';
import { useSubmitted } from '../lib/useSubmitted';
import { quickAction } from '../lib/notes';
import { callSheetFor, phaseOf, wrapOf, type Phase } from '../lib/todayPhase';
import { dayStat, shiftLabel } from '../lib/stats';
import { NotePrimaryAction } from './NotePrimaryAction';
import { dayWord } from './docs/docs';
import { fmtCountdown, toMinutes } from '../lib/dates';
import type { Preview, Scrub, ScrubStop } from '../lib/timeline';

/** A swipe past this share of the card's width, or a flick faster than FLICK px/ms, turns the card. */
const SWIPE_SHARE = 0.22;
const FLICK = 0.45;
/** How long the deck waits for the ruler to arrive before trusting the ruler again. */
const SETTLE_MS = 1200;

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** The line next to the TODAY tag: only where the shift stands, nothing the card already says. */
function heroMeta(n: Note, phase: Phase, sent: 'sent' | 'saved' | null): string {
  const now = toMinutes(today.time);
  if (sent) return sent === 'saved' ? 'Saved on this phone' : 'Hours sent';
  if (phase === 'before') return fmtCountdown(toMinutes(n.time!) - now);
  if (phase === 'during') return 'On set';
  return `Wrapped at ${wrapOf(n)}`;
}

interface CardModel {
  key: string;
  note?: Note;
  stop?: ScrubStop;
  /** Index of the stop in `scrub.stops`, for the ruler. */
  si?: number;
}

function DeckCard({ card, front, onBack }: { card: CardModel; front: boolean; onBack: () => void }) {
  const a = useNoteActions();
  const setLogOpen = useDemo((s) => s.setLogOpen);
  const offline = useDemo((s) => s.offline);
  const start = useDemo((s) => s.logStart);
  const end = useDemo((s) => s.logEnd);
  const breakMin = useDemo((s) => s.breakMin);
  const submitted = useSubmitted().includes(today.date);
  const n = card.note;

  if (!n) {
    return (
      <div className="deck-body">
        <div className="today-top">
          <span className="today-tag">TODAY</span>
          <span className="today-meta">Shoot day {today.shootDay}</span>
        </div>
        <div className="deck-empty">
          <span className="deck-t1">Nothing on your sheet yet</span>
          <span className="deck-t2">Call times and travel from production show up here.</span>
        </div>
      </div>
    );
  }

  const isHero = !card.stop;
  const phase = phaseOf(n);
  const sheet = n.type === 'appointment' && n.day ? callSheetFor(n.day) : undefined;
  const attachment = !n.primaryAction && quickAction(n);
  const time = n.kind === 'time' ? n.time : 'All day';
  // What was sent: today's shift as the Log sheet holds it (editing it after sending un-sends the day).
  const sent = isHero && submitted && end ? dayStat(today.date, { date: today.date, kind: 'shoot', start, end, breakMin, status: 'submitted' }) : null;

  let primary: ReactNode = null;
  if (isHero && phase === 'after' && !submitted) {
    primary = (
      <button type="button" className="btn btn-lime deck-cta" onClick={() => setLogOpen(true)}>
        <Icon name="logTime" size={18} color="#111A1B" strokeWidth={1.8} />
        Submit hours
      </button>
    );
  } else if (n.primaryAction) {
    primary = <NotePrimaryAction note={n} className="deck-cta" />;
  } else if (attachment) {
    primary = (
      <button type="button" className="btn btn-primary deck-cta" onClick={() => a.quick(n)}>
        <Icon name="clip" size={16} color="#FFFFFF" strokeWidth={1.8} />
        Open
      </button>
    );
  } else {
    primary = (
      <button type="button" className="btn deck-cta deck-cta-quiet" onClick={() => a.openNote(n.id)}>
        Details
      </button>
    );
  }

  return (
    <div className="deck-body">
      {/* Always in the hero card, so a screen reader hears the change when hours are sent. */}
      {isHero && (
        <p className="sr-only" role="status">
          {submitted ? (offline ? "Saved on this phone, sends when you're online." : sent ? `Hours sent: ${shiftLabel(sent).replace(' · ', ', ')}.` : 'Hours sent.') : ''}
        </p>
      )}
      <div className="today-top">
        {isHero ? (
          <>
            <span className="today-tag" data-tone="lime">
              TODAY
            </span>
            <span className="today-meta">{heroMeta(n, phase, submitted ? (offline ? 'saved' : 'sent') : null)}</span>
          </>
        ) : (
          <>
            <span className="today-tag">{n.day ? dayWord(n.day).toUpperCase() : 'LATER'}</span>
            <span className="today-meta">{card.stop!.rel}</span>
            {front && (
              <button type="button" className="pill-btn deck-back" onClick={onBack}>
                Back to now
              </button>
            )}
          </>
        )}
      </div>
      <button type="button" className="deck-main" onClick={() => a.openNote(n.id)} aria-label={`${time}, ${n.title}. Open details`}>
        <span className={`deck-time num${n.kind === 'time' ? '' : ' deck-time-sm'}`}>{time}</span>
        <span className="deck-titles">
          <span className="deck-t1">{n.title}</span>
          {n.subtitle && <span className="deck-t2">{n.subtitle}</span>}
        </span>
      </button>
      <div className="deck-ctas">
        {primary}
        {sheet && (
          <button
            type="button"
            className="deck-sheet"
            aria-label={`Open call sheet, ${sheet.title.replace('Call sheet · ', '')}${sheet.isNew ? ', updated' : ''}`}
            onClick={() => a.openPdf(sheet.file)}
          >
            <Icon name="file" size={20} color="#111A1B" strokeWidth={1.7} />
            <span className="deck-sheet-l">Sheet</span>
            {sheet.isNew && <span className="deck-new" aria-hidden="true" />}
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * The top of Home: a deck of cards. Today's call, with its call sheet, is in front and the coming notes peek
 * behind it. Swiping or the arrow keys turn the deck and the ruler above glides along; scrubbing
 * the ruler turns the deck the same way. The ruler's preview stays the one truth for which note is shown.
 */
export function TodayCard({ hero, scrub, preview, onGoTo }: { hero: Note | undefined; scrub: Scrub; preview: Preview | null; onGoTo: (stopIndex: number) => void }) {
  // Today's call is also a stop on the ruler; it is the front card, not a second one.
  const cards: CardModel[] = [
    { key: hero ? `hero-${hero.id}` : 'empty', note: hero },
    ...scrub.stops.flatMap((s, si) => (s.note.id === hero?.id ? [] : [{ key: s.note.id, note: s.note, stop: s, si }])),
  ];
  const count = cards.length;
  const fromRuler = preview ? Math.max(0, cards.findIndex((c) => c.si === preview.index)) : 0;

  // The deck turns at once and the ruler follows. Until it arrives, notes it passes on the way don't flip the deck.
  const [index, setIndex] = useState(fromRuler);
  const pending = useRef<number | null>(null);
  const latest = useRef(fromRuler);
  latest.current = fromRuler;
  const timer = useRef(0);
  useEffect(() => {
    if (pending.current !== null && fromRuler !== pending.current) return;
    pending.current = null;
    setIndex(fromRuler);
  }, [fromRuler]);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const i = Math.min(index, count - 1);

  const go = (to: number) => {
    const t = Math.max(0, Math.min(count - 1, to));
    if (t === i) return;
    setIndex(t);
    pending.current = t;
    onGoTo(cards[t].si ?? -1);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      // The ruler was grabbed mid-glide: show where it really is.
      if (pending.current === null) return;
      pending.current = null;
      setIndex(latest.current);
    }, SETTLE_MS);
  };

  // Horizontal drags turn the deck; vertical ones scroll the page (touch-action: pan-y).
  const deckRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState(0);
  const g = useRef<{ x: number; y: number; on: boolean; lx: number; lt: number; v: number } | null>(null);
  const swallowClick = useRef(false);
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || count < 2) return;
    g.current = { x: e.clientX, y: e.clientY, on: false, lx: e.clientX, lt: e.timeStamp, v: 0 };
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const s = g.current;
    if (!s) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (!s.on) {
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) return void (g.current = null);
      if (Math.abs(dx) < 8) return;
      s.on = true;
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    const dt = e.timeStamp - s.lt;
    if (dt > 0) s.v = (e.clientX - s.lx) / dt;
    s.lx = e.clientX;
    s.lt = e.timeStamp;
    // Past either end the card only gives a little.
    const edge = (dx > 0 && i === 0) || (dx < 0 && i === count - 1);
    setDrag(edge ? dx * 0.3 : dx);
  };
  const onPointerEnd = (e: PointerEvent<HTMLDivElement>) => {
    const s = g.current;
    g.current = null;
    if (!s?.on) return;
    // The click that ends a drag must not open the card under the finger.
    swallowClick.current = true;
    window.setTimeout(() => (swallowClick.current = false), 0);
    const w = e.currentTarget.offsetWidth;
    const dx = e.clientX - s.x;
    if (e.type === 'pointerup' && (dx < -w * SWIPE_SHARE || s.v < -FLICK)) go(i + 1);
    else if (e.type === 'pointerup' && (dx > w * SWIPE_SHARE || s.v > FLICK)) go(i - 1);
    setDrag(0);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === 'ArrowRight') go(i + 1);
    else if (e.key === 'ArrowLeft') go(i - 1);
    else return;
    e.preventDefault();
  };

  const w = deckRef.current?.offsetWidth || 340;
  const p = Math.min(1, Math.abs(drag) / w);
  const tilt = reducedMotion() ? 0 : 8;
  /** Resting place of a card `pos` steps behind the front one (fractions while dragging): lower, smaller, shaded. */
  const behind = (pos: number) =>
    ({
      transform: `translateY(${pos * 13}px) scale(${1 - pos * 0.05})`,
      opacity: pos > 2 ? 0 : 1,
      '--shade': Math.min(pos, 2) * 0.1,
    }) as CSSProperties;

  const label = (k: number) => {
    const c = cards[k];
    return c.note ? `${c.stop ? c.stop.when : 'Today'}, ${c.note.title}` : 'Today';
  };

  return (
    <section className="deck" aria-roledescription="carousel" aria-label="Today and what's next. Swipe or use the arrow keys for the next card" onKeyDown={onKeyDown}>
      <div
        className={`deck-stack${drag ? ' is-dragging' : ''}`}
        ref={deckRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onClickCapture={(e) => {
          if (!swallowClick.current) return;
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        {cards.map((c, k) => {
          const slot = k - i;
          if (slot < -1 || slot > 3) return null;
          let style: CSSProperties;
          if (slot < 0) {
            // The card you turned past waits off to the left; dragging right brings it back over the front.
            style = {
              transform: `translateX(${drag > 0 ? `calc(-108% + ${drag}px)` : '-108%'}) rotate(${-tilt * (1 - p)}deg)`,
              opacity: drag > 0 ? 1 : 0,
            };
          } else if (slot === 0 && drag < 0) {
            style = { transform: `translateX(${drag}px) rotate(${(drag / w) * tilt}deg)` };
          } else {
            style = behind(slot + (drag > 0 ? p : drag < 0 ? -p : 0));
          }
          return (
            <article
              key={c.key}
              className="deck-card"
              style={{ ...style, zIndex: 10 - slot }}
              aria-roledescription="slide"
              aria-label={`${k + 1} of ${count}`}
              aria-hidden={slot !== 0}
              inert={slot !== 0}
            >
              <DeckCard card={c} front={slot === 0} onBack={() => go(0)} />
            </article>
          );
        })}
      </div>
      <p className="sr-only" aria-live="polite">
        {i > 0 ? `Card ${i + 1} of ${count}: ${label(i)}` : ''}
      </p>
    </section>
  );
}
