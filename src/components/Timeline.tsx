import { useEffect, useMemo, useRef, type CSSProperties, type RefObject } from 'react';
import { useDemo } from '../store';
import { notes } from '../mock';
import { Icon } from './Icon';
import { TYPE_COLOR } from '../lib/noteStyle';
import { buildTimeline } from '../lib/timeline';
import { TYPE_LABEL } from '../lib/notes';

const DRAG_THRESHOLD = 5;
/** Fastest fling that still counts, px per ms: a flick moves about one marker, not the whole strip. */
const MAX_FLING = 1.2;

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Drag-to-scroll for mouse users (touch and trackpads scroll natively). While dragging, CSS
 * snapping is off; on release the strip glides to the snap point the swipe was heading for.
 * Everything happens on the DOM node, so React never re-renders while you drag.
 */
function useDragScroll(ref: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let startX = 0;
    let startLeft = 0;
    let pointer: number | null = null;
    let dragging = false;
    let swallowClick = false;
    let lastX = 0;
    let lastT = 0;
    let velocity = 0; // px per ms, positive = content moving left (scrollLeft growing)
    let restore = 0;

    const snapPoints = () => {
      const pad = parseFloat(getComputedStyle(el).scrollPaddingLeft) || 0;
      const max = el.scrollWidth - el.clientWidth;
      return Array.from(el.querySelectorAll<HTMLElement>('.tl-seg')).map((seg) => ({
        start: Math.min(Math.max(seg.offsetLeft - pad, 0), max),
        end: Math.min(Math.max(seg.offsetLeft + seg.offsetWidth - el.clientWidth + pad, 0), max),
      }));
    };

    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      window.clearTimeout(restore);
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
      const dx = e.clientX - startX;
      if (!dragging) {
        if (Math.abs(dx) < DRAG_THRESHOLD) return;
        dragging = true;
        swallowClick = true;
        el.dataset.drag = 'true';
        el.style.scrollSnapType = 'none';
        el.setPointerCapture(e.pointerId);
      }
      el.scrollLeft = startLeft - dx;
      const dt = e.timeStamp - lastT;
      if (dt > 0) velocity = 0.8 * velocity + 0.2 * ((lastX - e.clientX) / dt);
      lastX = e.clientX;
      lastT = e.timeStamp;
    };

    const onUp = (e: PointerEvent) => {
      if (e.pointerId !== pointer) return;
      pointer = null;
      if (!dragging) return;
      dragging = false;
      delete el.dataset.drag;
      // Keep going a little in the swipe direction, then land on a snap point
      // (or stay put when that spot is inside a segment wider than the screen).
      const projected = el.scrollLeft + Math.max(-MAX_FLING, Math.min(MAX_FLING, velocity)) * 220;
      const points = snapPoints();
      const inFreeZone = points.some((p) => p.end > p.start && projected > p.start && projected < p.end);
      const target = inFreeZone
        ? projected
        : points.reduce((best, p) => (Math.abs(p.start - projected) < Math.abs(best - projected) ? p.start : best), points[0]?.start ?? 0);
      const smooth = !reducedMotion();
      el.scrollTo({ left: target, behavior: smooth ? 'smooth' : 'auto' });
      restore = window.setTimeout(() => (el.style.scrollSnapType = ''), smooth ? 420 : 0);
    };

    const onClickCapture = (e: MouseEvent) => {
      if (!swallowClick) return;
      swallowClick = false;
      e.preventDefault();
      e.stopPropagation();
    };

    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
    el.addEventListener('click', onClickCapture, true);
    return () => {
      window.clearTimeout(restore);
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
      el.removeEventListener('click', onClickCapture, true);
    };
  }, [ref]);
}

/** What is coming up: Now, +2 h, +4 h, Tonight, Tomorrow, In 2 days. Scrolls sideways, snaps to each marker. */
export function Timeline() {
  const empty = useDemo((s) => s.empty);
  const openSheet = useDemo((s) => s.openSheet);
  const ref = useRef<HTMLDivElement>(null);
  useDragScroll(ref);
  const segments = useMemo(() => buildTimeline(empty ? [] : notes), [empty]);

  if (segments.every((s) => s.chips.length === 0)) return null;
  return (
    <section className="tl" aria-label="Coming up">
      <div className="tl-scroll" ref={ref} tabIndex={0}>
        {segments.map((seg) => (
          <div className="tl-seg" key={seg.key} style={{ '--n': seg.chips.length } as CSSProperties} data-now={seg.label === 'Now'}>
            <div className="tl-mark">
              <strong>{seg.label}</strong>
              {seg.sub && <span>{seg.sub}</span>}
            </div>
            <span className="tl-axis" aria-hidden="true" />
            <div className="tl-chips">
              {seg.chips.map(({ note, time, title, rel, next }) => (
                <button
                  type="button"
                  key={note.id}
                  className="tl-chip"
                  data-next={next}
                  aria-label={`${time}, ${title}, ${TYPE_LABEL[note.type]}, ${rel}. Open`}
                  onClick={() => openSheet('note', note.id)}
                >
                  <span className="tl-icon" style={{ color: TYPE_COLOR[note.type].dot }}>
                    <Icon name={note.type} size={16} />
                  </span>
                  <span className="tl-text">
                    <span className="tl-time num">{time}</span>
                    <span className="tl-title">{title}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
