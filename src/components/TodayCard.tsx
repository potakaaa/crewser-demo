import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import { notes as allNotes, today, todayLabel, type Note } from '../mock';
import { useDemo } from '../store';
import { Icon, noteIcon } from './Icon';
import { useNoteActions } from '../lib/actions';
import { useSubmitted } from '../lib/useSubmitted';
import { quickAction, TYPE_LABEL } from '../lib/notes';
import { callSheetNear, phaseOf, wrapMinutes, wrapOf, type Phase } from '../lib/todayPhase';
import { dayStat, shiftLabel } from '../lib/stats';
import { dayWord } from './docs/docs';
import { fmtCountdown, fmtDayShort, toMinutes } from '../lib/dates';
import type { Preview, Scrub, ScrubStop } from '../lib/timeline';
import { useAxisDrag } from '../lib/useAxisDrag';
import { guideEmit } from '../lib/guide';

/** A swipe past this share of the card's width, or a flick faster than FLICK px/ms, turns the card. */
const SWIPE_SHARE = 0.22;
const FLICK = 0.45;
/** How long the deck waits for the ruler to arrive before trusting the ruler again. */
const SETTLE_MS = 1200;

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** The pill and the line beside it on today's card: where the shift stands. */
function heroStatus(n: Note, phase: Phase, sent: 'sent' | 'saved' | null): { pill: string; tone: Tone; rel: string } {
  const now = toMinutes(today.time);
  const wrap = wrapOf(n);
  const wrapMin = wrapMinutes(n);
  // A shoot day is over after the wrap; a travel day after its last timed item. Until then, hours sent change nothing here.
  const lastToday = Math.max(...notesToday().map((x) => toMinutes(x.time!)));
  const over = n.type === 'appointment' ? phase === 'after' : now >= lastToday;
  if (sent && over) return { pill: sent === 'saved' ? 'SAVED' : 'HOURS SENT', tone: 'neutral', rel: sent === 'saved' ? 'Sends when online' : wrap ? `Wrapped at ${wrap}` : 'Day done' };
  if (now < toMinutes(n.time!)) return { pill: 'UP NEXT', tone: 'lime', rel: fmtCountdown(toMinutes(n.time!) - now) };
  if (n.type !== 'appointment') return over ? { pill: 'DONE', tone: 'neutral', rel: 'Day done' } : { pill: 'ON THE WAY', tone: 'teal', rel: 'Departed' };
  if (phase === 'during') return { pill: 'ON SET', tone: 'teal', rel: wrapMin !== null ? `wrap ${fmtCountdown(wrapMin - now)}` : 'wrap to be confirmed' };
  return { pill: 'WRAPPED', tone: 'neutral', rel: wrap ? `at ${wrap}` : '' };
}

/** Today's timed notes; the travel day ends with the last of them. */
const notesToday = () => allNotes.filter((x) => x.day === today.date && x.kind === 'time');

type Tone = 'lime' | 'teal' | 'neutral';

interface CardModel {
  key: string;
  note?: Note;
  stop?: ScrubStop;
  /** Index of the stop in `scrub.stops`, for the ruler. */
  si?: number;
}

function DeckCard({ card }: { card: CardModel }) {
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
          <span className="today-meta">{todayLabel}</span>
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
  // Every card offers the call sheet for its day; a day without one gets the next issued (else the latest), so it never dead-ends.
  const sheet = callSheetNear(n.day ?? today.date);
  const attachment = !n.primaryAction && quickAction(n);
  const time = n.kind === 'time' ? n.time : 'All day';
  // What was sent: today's shift as the Log sheet holds it (editing it after sending un-sends the day).
  const sent = isHero && submitted && end ? dayStat(today.date, { date: today.date, kind: 'shoot', start, end, breakMin, status: 'submitted' }) : null;
  const status = isHero
    ? heroStatus(n, phase, submitted ? (offline ? 'saved' : 'sent') : null)
    : { pill: n.day && dayWord(n.day) === 'Tomorrow' ? 'TOMORROW' : TYPE_LABEL[n.type].toUpperCase(), tone: 'neutral' as Tone, rel: card.stop!.rel };
  const wrap = n.facts.find((f) => f.label === 'Wrap');
  const flightNo = n.type === 'flight' ? n.facts.find((f) => f.action === 'copy')?.value : undefined;
  const pickup = n.facts.find((f) => f.label === 'Pickup')?.value;
  const pickupAt = n.facts.find((f) => f.label === 'Pickup point')?.value;
  const sub =
    n.type === 'appointment'
      ? `Call · wrap ${!wrap || wrap.unconfirmed ? 'TBC' : wrap.value}`
      : pickup
        ? `Pickup ${pickup}${pickupAt ? ` · ${pickupAt.toLowerCase()}` : ''}`
        : flightNo && n.day
          ? `${flightNo} · ${fmtDayShort(n.day)}`
          : card.stop?.when;
  const place = n.facts.find((f) => f.action === 'map')?.value;
  // A flight's subtitle repeats its number when the line above already has it: then the row keeps just the route.
  const where = place ?? (flightNo && !pickup ? n.subtitle?.replace(`${flightNo} · `, '') : n.subtitle);

  let primary: ReactNode = null;
  if (isHero && phase === 'after' && !submitted) {
    primary = (
      <button type="button" className="btn btn-lime deck-cta" onClick={() => setLogOpen(true)}>
        <Icon name="logTime" size={18} color="currentColor" strokeWidth={1.8} />
        Submit hours
      </button>
    );
  } else if (n.primaryAction) {
    const boarding = n.primaryAction.kind === 'boardingPass';
    primary = (
      <button type="button" className="btn btn-primary deck-cta" onClick={() => a.primary(n)}>
        <Icon name={boarding ? 'ticket' : 'nav'} size={16} color="currentColor" strokeWidth={1.8} />
        {n.primaryAction.short}
      </button>
    );
  } else if (attachment) {
    primary = (
      <button type="button" className="btn btn-primary deck-cta" onClick={() => a.quick(n)}>
        <Icon name="clip" size={16} color="currentColor" strokeWidth={1.8} />
        Open
      </button>
    );
  }

  // Self-check while developing: a card never prints a value that is missing for its note type.
  if (import.meta.env.DEV) console.assert(![status.pill, status.rel, sub, where].some((t) => String(t).includes('undefined')), 'deck card text has undefined', n.id);

  return (
    <div className="deck-body">
      {/* Always in the hero card, so a screen reader hears the change when hours are sent. */}
      {isHero && (
        <p className="sr-only" role="status">
          {submitted ? (offline ? "Saved on this phone, sends when you're online." : sent ? `Hours sent: ${shiftLabel(sent).replace(' · ', ', ')}.` : 'Hours sent.') : ''}
        </p>
      )}
      <div className="deck-head">
        <span className="deck-pill" data-tone={status.tone}>
          {status.pill}
        </span>
        <span className="deck-rel">{status.rel}</span>
        <button type="button" className="deck-open" onClick={() => a.openNote(n.id)} aria-label={`${n.title}. Open details`}>
          <Icon name="arrowUpRight" size={18} color="currentColor" strokeWidth={1.8} />
        </button>
      </div>
      <div className="deck-main">
        <span className={`deck-time num${n.kind === 'time' ? '' : ' deck-time-sm'}`}>{time}</span>
        <span className="deck-titles">
          <span className="deck-t1">{n.title}</span>
          {sub && <span className="deck-t2">{sub}</span>}
        </span>
      </div>
      {where && (
        <p className="deck-place">
          <Icon name={place ? 'pin' : noteIcon(n.type)} size={16} color="currentColor" strokeWidth={1.7} />
          <span>{where}</span>
        </p>
      )}
      <div className="deck-ctas">
        {sheet && (
          <button
            type="button"
            className="btn deck-cta deck-sheet"
            aria-label={`Open call sheet, ${sheet.title.replace('Call sheet · ', '')}${sheet.isNew ? ', updated' : ''}`}
            onClick={() => a.openPdf(sheet.file)}
          >
            Call sheet
            {sheet.isNew && <span className="deck-new" aria-hidden="true" />}
          </button>
        )}
        {primary}
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
  // Today's call is also a stop on the ruler; it is the front card, not a second one. The rest follow in
  // time order, so turning the deck always moves the ruler forward.
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
    guideEmit('deck:swiped');
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

  // Horizontal drags turn the deck; vertical ones stay the page's (touch-action: pan-y, see useAxisDrag).
  const [drag, setDrag] = useState(0);
  const { ref: deckRef, handlers } = useAxisDrag<HTMLDivElement>('x', {
    enabled: count > 1,
    // Past either end the card only gives a little.
    onDrag: (dx) => setDrag((dx > 0 && i === 0) || (dx < 0 && i === count - 1) ? dx * 0.3 : dx),
    onRelease: (dx, v, cancelled) => {
      setDrag(0);
      if (cancelled) return;
      const w = deckRef.current?.offsetWidth || 340;
      if (dx < -w * SWIPE_SHARE || v < -FLICK) go(i + 1);
      else if (dx > w * SWIPE_SHARE || v > FLICK) go(i - 1);
    },
  });
  // A key turn leaves focus in the card that just went inert; hand it to the new front card.
  const keyTurn = useRef(false);
  useEffect(() => {
    if (!keyTurn.current) return;
    keyTurn.current = false;
    deckRef.current?.querySelector<HTMLElement>('.deck-card:not([inert]) .deck-open')?.focus({ preventScroll: true });
  }, [i]);
  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    keyTurn.current = true;
    if (e.key === 'ArrowRight') go(i + 1);
    else if (e.key === 'ArrowLeft') go(i - 1);
    else if (e.key === 'Home') go(0);
    else return void (keyTurn.current = false);
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
    <section className="deck" data-guide="deck" aria-roledescription="carousel" aria-label="Today and what's next. Swipe or use the arrow keys for the next card" onKeyDown={onKeyDown}>
      <div
        className={`deck-stack${drag ? ' is-dragging' : ''}`}
        ref={deckRef}
        {...handlers}
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
              style={{ ...style, zIndex: 10 - slot, '--slot': Math.max(0, slot) } as CSSProperties}
              aria-roledescription="slide"
              aria-label={`${k + 1} of ${count}`}
              aria-hidden={slot !== 0}
              inert={slot !== 0}
            >
              <DeckCard card={c} />
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
