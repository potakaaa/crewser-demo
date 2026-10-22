import { useCallback, useEffect, useId, useImperativeHandle, useRef, useState, type KeyboardEvent, type Ref } from 'react';
import { TYPE_COLOR } from '../lib/noteStyle';
import { NAV_EPS, previewAt, previewLine, samePreview, type Preview, type Scrub } from '../lib/timeline';

const DRAG_THRESHOLD = 5;
/** Fastest fling that still counts, px per ms. */
const MAX_FLING = 1.6;
/** A pause this long before release means the finger had stopped: no fling. */
const STALE_MS = 80;

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export interface TimelineHandle {
  /** Scroll the playhead back to Now. */
  backToNow: () => void;
}

/**
 * Everything that moves the ruler. Touch and trackpads scroll it natively; this adds mouse drag
 * (with a short fling), the mouse wheel, and tells `onScrub` the scroll position once per frame.
 * It works on the DOM node, so React never re-renders while the ruler moves.
 */
function useScrubber(el: HTMLDivElement | null, onScrub: (x: number) => void) {
  const onScrubRef = useRef(onScrub);
  useEffect(() => {
    onScrubRef.current = onScrub;
  });

  useEffect(() => {
    if (!el) return;
    let frame = 0;
    const report = () => {
      frame = 0;
      onScrubRef.current(el.scrollLeft);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(report);
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
    };

    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
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
    };
    // Cancelled, or capture taken away: stop where we are, no fling.
    const onCancel = (e: PointerEvent) => {
      if (e.pointerId === pointer) endDrag();
    };

    // A mouse wheel only scrolls up and down; here it scrubs. Only real wheel notches count: line steps,
    // or whole multiples of 100 px. Trackpad swipes and their momentum send other values, so the page
    // keeps scrolling. And once the ruler is at its end in that direction the wheel goes back to the page.
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.deltaX !== 0 || e.deltaY === 0) return;
      const notched = e.deltaMode === 1 || (e.deltaMode === 0 && e.deltaY % 100 === 0);
      if (!notched) return;
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
    return () => {
      if (frame) cancelAnimationFrame(frame);
      el.removeEventListener('scroll', onScroll);
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onCancel);
      el.removeEventListener('lostpointercapture', onCancel);
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('click', onClickCapture, true);
    };
  }, [el]);
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
  useScrubber(el, onScrub);

  // The parent's preview is the truth: a reset from outside (Back to now) lets the next scroll report again.
  useEffect(() => {
    shown.current = preview;
  }, [preview]);

  const backToNow = useCallback(() => {
    if (!el) return;
    // The "Back to now" button disappears as the preview ends and takes focus with it:
    // once the ruler has settled, focus goes to the ruler instead of the page.
    let settled = false;
    const settle = () => {
      if (settled) return;
      settled = true;
      if (!document.activeElement || document.activeElement === document.body) el.focus({ preventScroll: true });
    };
    if (el.scrollLeft < 1) return settle();
    el.addEventListener('scrollend', settle, { once: true });
    window.setTimeout(settle, reducedMotion() ? 50 : 600);
    el.scrollTo({ left: 0, behavior: reducedMotion() ? 'auto' : 'smooth' });
  }, [el]);
  useImperativeHandle(handle, () => ({ backToNow }), [backToNow]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!el) return;
    const x = el.scrollLeft;
    let to: number | null = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') to = scrub.stops.find((s) => s.x > x + NAV_EPS)?.x ?? x;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') to = [...scrub.stops].reverse().find((s) => s.x < x - NAV_EPS)?.x ?? 0;
    else if (e.key === 'Home') to = 0;
    else if (e.key === 'End') to = scrub.stops[scrub.stops.length - 1]?.x ?? 0;
    if (to === null) return;
    e.preventDefault();
    el.scrollTo({ left: to, behavior: reducedMotion() ? 'auto' : 'smooth' });
  };

  if (!scrub.stops.length) return null;
  const line = preview ? previewLine(scrub, preview) : 'Now. Nothing previewed.';
  const current = preview && scrub.stops[preview.index];
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
            {scrub.marks.map((m) => (
              <span className="tl-mark" key={m.key} data-now={m.x === 0} style={{ left: m.x }}>
                <span className="tl-label">{m.label}</span>
              </span>
            ))}
            {scrub.stops.map((s, i) => (
              <span
                className="tl-dot"
                key={s.note.id}
                data-on={preview?.index === i}
                style={{ left: s.x, background: TYPE_COLOR[s.note.type].dot }}
                aria-hidden="true"
              />
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
