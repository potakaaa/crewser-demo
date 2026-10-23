import { useCallback, useEffect, useId, useImperativeHandle, useRef, useState, type CSSProperties, type KeyboardEvent, type Ref, type RefObject } from 'react';
import '../styles/timeline.css';
import { TYPE_COLOR } from '../lib/noteStyle';
import { clusters as clusterOf, MARK_GAP, NAV_EPS, previewAt, previewLine, samePreview, snapTarget, type Preview, type Scrub } from '../lib/timeline';

const DRAG_THRESHOLD = 5;
/** Fastest fling that still counts, px per ms. */
const MAX_FLING = 1.6;
/** A pause this long before release means the finger had stopped: no fling. */
const STALE_MS = 80;
/** The ruler counts as settled this long after its last scroll event (momentum included). */
const IDLE_MS = 120;
/** Two taps this close in time (ms) and place (px) are a double tap. */
const DOUBLE_TAP_MS = 350;
const DOUBLE_TAP_PX = 30;
/** A touch that moves less than this (px) and ends within TAP_MS is a tap, not a swipe. */
const TAP_PX = 10;
const TAP_MS = 300;

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export interface TimelineHandle {
  /** Scroll the playhead back to Now. */
  backToNow: () => void;
}

/** What the Timeline can ask of the scrubber: glide the ruler to a position, and where a glide is heading. */
interface Glider {
  /** Animate scrollLeft to `x` (a jump with reduced motion); `done` runs when it arrives. */
  glideTo: (x: number, done?: () => void) => void;
  /** Where the glide in progress is heading, or null. */
  target: () => number | null;
}

/**
 * Everything that moves the ruler. Touch and trackpads scroll it natively; this adds mouse drag
 * (with a short fling), the mouse wheel, and tells `onScrub` the scroll position once per frame.
 * Once the ruler has been still for a moment, with no finger or button down, it glides to the
 * position `snapTo` names (the next note, or Now). A double tap or double click calls `onDoubleTap`.
 * It works on the DOM node, so React never re-renders while the ruler moves.
 */
function useScrubber(
  el: HTMLDivElement | null,
  onScrub: (x: number) => void,
  snapTo: (x: number) => number | null,
  onDoubleTap: () => void,
): RefObject<Glider> {
  const onScrubRef = useRef(onScrub);
  const snapRef = useRef(snapTo);
  const doubleTapRef = useRef(onDoubleTap);
  useEffect(() => {
    onScrubRef.current = onScrub;
    snapRef.current = snapTo;
    doubleTapRef.current = onDoubleTap;
  });
  const glider = useRef<Glider>({ glideTo: () => {}, target: () => null });

  useEffect(() => {
    if (!el) return;
    let frame = 0;
    const report = () => {
      frame = 0;
      onScrubRef.current(el.scrollLeft);
    };

    // Our own glide instead of CSS scroll-snap: the stops are irregular and tied notes sit a few px apart.
    let glide = 0;
    let glideEnd: number | null = null;
    const stopGlide = () => {
      if (glide) cancelAnimationFrame(glide);
      glide = 0;
      glideEnd = null;
    };
    const glideTo = (x: number, done?: () => void) => {
      stopGlide();
      const from = el.scrollLeft;
      const dist = x - from;
      if (Math.abs(dist) < 0.5 || reducedMotion()) {
        if (Math.abs(dist) >= 0.5) el.scrollLeft = x;
        done?.();
        return;
      }
      const dur = Math.min(240, 120 + Math.abs(dist) * 0.25); // about 160 ms for a short snap, to match the card's crossfade
      const t0 = performance.now();
      glideEnd = x;
      const step = (now: number) => {
        const k = Math.min((now - t0) / dur, 1);
        el.scrollLeft = k < 1 ? from + dist * (1 - (1 - k) ** 3) : x;
        if (k < 1) {
          glide = requestAnimationFrame(step);
          return;
        }
        glide = 0;
        glideEnd = null;
        done?.();
      };
      glide = requestAnimationFrame(step);
    };
    glider.current = { glideTo, target: () => glideEnd };

    // Settle: when nothing has moved the ruler for IDLE_MS and no finger or button is down, glide to the snap spot.
    let idle = 0;
    let touches = 0;
    const settle = () => {
      idle = 0;
      if (pointer !== null || touches > 0 || glide) return;
      const to = snapRef.current(el.scrollLeft);
      if (to !== null && Math.abs(to - el.scrollLeft) >= 0.5) glideTo(to);
    };
    const settleSoon = () => {
      window.clearTimeout(idle);
      idle = window.setTimeout(settle, IDLE_MS);
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(report);
      settleSoon();
    };

    let pointer: number | null = null;
    let dragging = false;
    let swallowClick = false;
    let startX = 0;
    let startLeft = 0;
    let lastX = 0;
    let lastT = 0;
    let velocity = 0; // px per ms, positive = scrollLeft growing

    const endDrag = (e?: PointerEvent) => {
      if (pointer === null) return;
      const wasDragging = dragging;
      pointer = null;
      dragging = false;
      delete el.dataset.drag;
      if (!wasDragging) return;
      // A finger that stopped before lifting must not fling with the speed it had earlier.
      const fresh = e ? e.timeStamp - lastT < STALE_MS : false;
      if (fresh && !reducedMotion()) {
        const projected = el.scrollLeft + Math.max(-MAX_FLING, Math.min(MAX_FLING, velocity)) * 200;
        el.scrollTo({ left: projected, behavior: 'smooth' });
      }
      settleSoon(); // a drag that stops dead sends no more scroll events
    };

    // Double tap: touch and pen only. A mouse double click arrives as its own event.
    let tapId: number | null = null;
    let tapX = 0;
    let tapY = 0;
    let tapT = 0;
    let lastTapT = -Infinity;
    let lastTapX = 0;
    let lastTapY = 0;

    const onDown = (e: PointerEvent) => {
      stopGlide();
      if (e.pointerType !== 'mouse') {
        tapId = e.pointerId;
        tapX = e.clientX;
        tapY = e.clientY;
        tapT = e.timeStamp;
        return;
      }
      if (e.button !== 0) return;
      pointer = e.pointerId;
      startX = lastX = e.clientX;
      startLeft = el.scrollLeft;
      lastT = e.timeStamp;
      velocity = 0;
      dragging = false;
      swallowClick = false;
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerId !== pointer) return;
      // The button was released somewhere we did not hear about (outside the window, say).
      if (e.buttons === 0) {
        endDrag();
        return;
      }
      const dx = e.clientX - startX;
      if (!dragging) {
        if (Math.abs(dx) < DRAG_THRESHOLD) return;
        dragging = true;
        swallowClick = true;
        el.dataset.drag = 'true';
        el.setPointerCapture(e.pointerId);
        el.scrollTo({ left: el.scrollLeft, behavior: 'auto' }); // cancel a glide in progress
      }
      el.scrollLeft = startLeft - dx;
      const dt = e.timeStamp - lastT;
      if (dt > 0) velocity = 0.8 * velocity + 0.2 * ((lastX - e.clientX) / dt);
      lastX = e.clientX;
      lastT = e.timeStamp;
    };

    const onUp = (e: PointerEvent) => {
      if (e.pointerId === pointer) endDrag(e);
      if (e.pointerId !== tapId) return;
      tapId = null;
      // A swipe cancels the pointer, so a pointerup that stayed put and was quick is a tap.
      if (Math.hypot(e.clientX - tapX, e.clientY - tapY) > TAP_PX || e.timeStamp - tapT > TAP_MS) return;
      if (e.timeStamp - lastTapT < DOUBLE_TAP_MS && Math.hypot(e.clientX - lastTapX, e.clientY - lastTapY) < DOUBLE_TAP_PX) {
        lastTapT = -Infinity;
        doubleTapRef.current();
        return;
      }
      lastTapT = e.timeStamp;
      lastTapX = e.clientX;
      lastTapY = e.clientY;
    };
    // Cancelled, or capture taken away: stop where we are, no fling.
    const onCancel = (e: PointerEvent) => {
      if (e.pointerId === pointer) endDrag();
      if (e.pointerId === tapId) tapId = null;
    };
    const onDblClick = (e: MouseEvent) => {
      e.preventDefault(); // no text selection
      doubleTapRef.current();
    };

    // A finger on the ruler holds the snap back until it lifts; the browser's own momentum then runs, and
    // the settle timer waits for it to end.
    const onTouchStart = () => {
      touches += 1;
      stopGlide();
    };
    const onTouchEnd = () => {
      touches = Math.max(0, touches - 1);
      if (!touches) settleSoon();
    };

    // A mouse wheel only scrolls up and down; here it scrubs, but only where that cannot be mistaken for
    // the page scrolling. A notch is a line step, or exactly 120 in the legacy wheelDeltaY that is not
    // just 3x the delta (Chrome and Safari fake that for trackpads). Everything else, a trackpad's swipes
    // and momentum included, is left to the page, and so is any notch right after one. Sideways
    // swipes and Shift+wheel arrive as deltaX and scroll the ruler natively.
    let lastOther = -Infinity;
    const onWheel = (e: WheelEvent) => {
      stopGlide();
      const legacy = (e as WheelEvent & { wheelDeltaY?: number }).wheelDeltaY ?? 0;
      const notched = e.deltaX === 0 && e.deltaY !== 0 && !e.ctrlKey && (e.deltaMode === 1 || (e.deltaMode === 0 && Math.abs(legacy) === 120 && legacy !== -3 * e.deltaY));
      if (!notched) {
        lastOther = e.timeStamp;
        return;
      }
      if (!e.cancelable || e.timeStamp - lastOther < 150) return;
      const atStart = el.scrollLeft <= 0 && e.deltaY < 0;
      const atEnd = el.scrollLeft >= el.scrollWidth - el.clientWidth - 1 && e.deltaY > 0;
      if (atStart || atEnd) return;
      e.preventDefault();
      el.scrollBy({ left: e.deltaY * (e.deltaMode === 1 ? 16 : 1) * 0.6, behavior: 'auto' });
    };

    const onClickCapture = (e: MouseEvent) => {
      if (!swallowClick) return;
      swallowClick = false;
      e.preventDefault();
      e.stopPropagation();
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onCancel);
    el.addEventListener('lostpointercapture', onCancel);
    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('click', onClickCapture, true);
    el.addEventListener('dblclick', onDblClick);
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchend', onTouchEnd);
    el.addEventListener('touchcancel', onTouchEnd);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      stopGlide();
      window.clearTimeout(idle);
      glider.current = { glideTo: () => {}, target: () => null };
      el.removeEventListener('scroll', onScroll);
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onCancel);
      el.removeEventListener('lostpointercapture', onCancel);
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('click', onClickCapture, true);
      el.removeEventListener('dblclick', onDblClick);
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [el]);

  return glider;
}

/**
 * A slim ruler to preview what is coming: drag, swipe or scroll it and the top card follows the
 * playhead. No cards on it, only marks and a dot where a note falls. The parent owns the preview
 * (it changes only when the note under the playhead changes); the ruler position stays in the DOM.
 */
export function Timeline({
  scrub,
  preview,
  onPreview,
  handle,
}: {
  scrub: Scrub;
  preview: Preview | null;
  onPreview: (p: Preview | null) => void;
  handle?: Ref<TimelineHandle>;
}) {
  // A callback ref in state, so the listeners attach again when the ruler comes back (toggling Empty).
  const [el, setEl] = useState<HTMLDivElement | null>(null);
  const shown = useRef<Preview | null>(null);
  const tickRef = useRef<HTMLSpanElement>(null);
  const hintId = useId();

  const onScrub = useCallback(
    (x: number) => {
      const next = previewAt(scrub, x);
      if (samePreview(next, shown.current)) return;
      const crossed = next && (!shown.current || next.index !== shown.current.index);
      shown.current = next;
      onPreview(next);
      if (!crossed) return;
      // A tick when the playhead reaches a note: a flash on the playhead, and a buzz where supported.
      const tick = tickRef.current;
      if (tick && !reducedMotion()) {
        tick.classList.remove('tl-tick-on');
        void tick.offsetWidth;
        tick.classList.add('tl-tick-on');
      }
      try {
        // Browsers only allow a buzz right after the user touched something.
        if (navigator.userActivation?.isActive) navigator.vibrate?.(6);
      } catch {
        /* vibration is optional */
      }
    },
    [scrub, onPreview],
  );
  // The parent's preview is the truth: a reset from outside (Back to now) lets the next scroll report again.
  useEffect(() => {
    shown.current = preview;
  }, [preview]);

  const backToNowRef = useRef<(focus?: boolean) => void>(() => {});
  const glider = useScrubber(
    el,
    onScrub,
    (x) => snapTarget(scrub, x),
    () => backToNowRef.current(true),
  );

  const backToNow = useCallback(
    (focus = false) => {
      if (!el) return;
      if (glider.current.target() === 0) return; // already on its way
      // The "Back to now" button disappears as the preview ends and takes focus with it:
      // once the ruler has settled, focus goes to the ruler instead of the page. A double tap on the ruler focuses it.
      const settle = () => {
        if (focus || !document.activeElement || document.activeElement === document.body) el.focus({ preventScroll: true });
      };
      glider.current.glideTo(0, settle);
    },
    [el, glider],
  );
  useEffect(() => {
    backToNowRef.current = backToNow;
  }, [backToNow]);
  useImperativeHandle(handle, () => ({ backToNow: () => backToNow() }), [backToNow]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!el) return;
    // Repeated presses step on from where the glide is heading, not from where it happens to be.
    const x = glider.current.target() ?? el.scrollLeft;
    let to: number | null = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') to = scrub.stops.find((s) => s.x > x + NAV_EPS)?.x ?? x;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') to = [...scrub.stops].reverse().find((s) => s.x < x - NAV_EPS)?.x ?? 0;
    else if (e.key === 'Home') to = 0;
    else if (e.key === 'End') to = scrub.stops[scrub.stops.length - 1]?.x ?? 0;
    if (to === null) return;
    e.preventDefault();
    glider.current.glideTo(to);
  };

  if (!scrub.stops.length) return null;
  const line = preview ? previewLine(scrub, preview) : 'Now. Nothing previewed.';
  const current = preview && scrub.stops[preview.index];
  const clusters = clusterOf(scrub.stops);
  return (
    <section className="tl" aria-label="Preview what is coming up">
      <div
        className="tl-scroll"
        ref={setEl}
        tabIndex={0}
        role="slider"
        aria-label="Preview upcoming notes"
        aria-describedby={hintId}
        aria-orientation="horizontal"
        aria-valuemin={0}
        aria-valuemax={scrub.stops.length}
        aria-valuenow={preview ? Math.min(preview.index + 1, scrub.stops.length) : 0}
        onKeyDown={onKeyDown}
      >
        <div className="tl-track">
          <div className="tl-ruler" style={{ width: scrub.length }}>
            {/* Earlier today: a dimmed backdrop in the room left of Now. It scrolls away; the ruler never starts before Now. */}
            <span className="tl-past" aria-hidden="true">
              <span className="tl-past-label" style={{ left: `calc(100% - ${MARK_GAP}px)` }}>
                Earlier
              </span>
              {scrub.past.map((d) => (
                <span className="tl-dot" key={d.note.id} style={{ left: `calc(100% + ${d.x}px)`, background: TYPE_COLOR[d.note.type].dot }} />
              ))}
            </span>
            {scrub.marks.map((m) => (
              <span className="tl-mark" key={m.key} data-now={m.x === 0} style={{ left: m.x }}>
                <span className="tl-label">{m.label}</span>
              </span>
            ))}
            {scrub.stops.map((s, i) => (
              <span
                className="tl-pin"
                key={s.note.id}
                data-on={preview?.index === i}
                data-n={clusters[i] ? true : undefined}
                style={{ left: s.x, '--pin': TYPE_COLOR[s.note.type].dot, '--span': `${clusters[i]?.span ?? 0}px` } as CSSProperties}
                aria-hidden="true"
              >
                <span className="tl-pin-dot" />
                {clusters[i] && <span className="tl-pin-n">{clusters[i].n}</span>}
              </span>
            ))}
          </div>
        </div>
      </div>
      <span className="tl-head" aria-hidden="true">
        <span className="tl-tick" ref={tickRef} />
      </span>
      <p className="sr-only" id={hintId}>
        Left and right arrow keys move between notes. Home goes back to now.
      </p>
      <p className="sr-only" role="status">
        {preview ? `${line}${current ? `: ${current.note.title}` : ''}` : ''}
      </p>
    </section>
  );
}
