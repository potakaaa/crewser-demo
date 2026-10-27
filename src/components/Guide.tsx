import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { useDemo, useRoute } from '../store';
import { GUIDE_STEPS, guideDone, onGuideEvent } from '../lib/guide';

/** Room around the spotlit element, and the gap to the tooltip card. */
const PAD = 8;
const GAP = 14;
/** A beat after the gesture lands, so the result is seen before the next step. */
const ADVANCE_MS = 700;

interface Hole {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Where `target` sits inside the app, in the app's own (unscaled) pixels: the desktop frame scales the phone. */
function measure(app: HTMLElement, target: string): Hole | null {
  const el = app.querySelector<HTMLElement>(`[data-guide="${target}"]`);
  if (!el) return null;
  const a = app.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  const k = app.offsetWidth / a.width || 1;
  return { x: (r.left - a.left) * k - PAD, y: (r.top - a.top) * k - PAD, w: r.width * k + PAD * 2, h: r.height * k + PAD * 2 };
}

/**
 * The first-visit spotlight tour. The screen dims except a hole around the step's target; touches inside the
 * hole reach the real UI, so the step completes when you do the gesture. Outside the hole nothing is tappable.
 * Next and Skip are always there; Esc skips.
 */
export function Guide() {
  const step = useDemo((s) => s.guide);
  const splash = useDemo((s) => s.splash);
  const route = useRoute();
  const navigate = useDemo((s) => s.navigate);
  const setStep = useDemo((s) => s.setGuideStep);
  const start = useDemo((s) => s.startGuide);
  const end = useDemo((s) => s.endGuide);
  const closeSheet = useDemo((s) => s.closeSheet);
  const setLogOpen = useDemo((s) => s.setLogOpen);
  const timer = useDemo((s) => s.timer);
  const stopTimer = useDemo((s) => s.stopTimer);
  // The switch steps leave you on another person or project; finishing puts you back where you started.
  const movedAway = useDemo((s) => !!s.guideFrom && s.guideFrom !== s.activeLinkId);
  const root = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const [hole, setHole] = useState<Hole | null>(null);
  const [appSize, setAppSize] = useState({ w: 0, h: 0 });

  // First visit: the tour starts once the splash is gone.
  useEffect(() => {
    if (!splash && step === null && !guideDone()) start();
  }, [splash, step, start]);

  const s = typeof step === 'number' ? GUIDE_STEPS[step] : null;
  const last = GUIDE_STEPS.length - 1;
  const next = () => setStep(typeof step === 'number' && step < last ? step + 1 : 'end');

  // Each step starts on its screen with nothing open over it (an open sheet makes the screen inert).
  useEffect(() => {
    if (!s) return;
    closeSheet();
    setLogOpen(false);
    if (route.name !== s.route) navigate({ name: s.route });
    // Route is read, not watched: a step moves you once, then lets you be.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // The gesture the step waits for completes it.
  useEffect(() => {
    if (!s?.waitFor) return;
    let t = 0;
    const off = onGuideEvent((e) => {
      if (!s.waitFor!.includes(e) || t) return;
      t = window.setTimeout(next, ADVANCE_MS);
    });
    return () => {
      off();
      window.clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Follow the target: it can move (scroll, resize, the deck turning, a menu opening).
  useLayoutEffect(() => {
    const app = root.current?.parentElement;
    if (!s || !app) return setHole(null);
    const update = () => {
      setAppSize({ w: app.offsetWidth, h: app.offsetHeight });
      setHole(measure(app, s.target));
    };
    update();
    const id = window.setInterval(update, 250);
    window.addEventListener('resize', update);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('resize', update);
    };
  }, [s, route.name]);

  // Focus goes to the card, so its text is read and Next/Skip are one Tab away; Esc skips the tour.
  useEffect(() => {
    if (step === null) return;
    card.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      end();
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [step, end]);

  if (step === null) return null;

  if (step === 'end') {
    return (
      <div className="guide guide-end" ref={root}>
        <div className="guide-card guide-card-center" ref={card} tabIndex={-1} role="dialog" aria-labelledby="guide-t" aria-describedby="guide-b">
          <p className="guide-t" id="guide-t">
            You're set
          </p>
          <p className="guide-b" id="guide-b">
            {movedAway ? 'Done takes you back to your own link. ' : ''}Replay this tour any time from Settings.
          </p>
          <div className="guide-actions">
            {timer && (
              <button
                type="button"
                className="guide-skip"
                onClick={() => {
                  end();
                  stopTimer();
                }}
              >
                Stop the timer
              </button>
            )}
            <button type="button" className="guide-next" data-primary onClick={end}>
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!s) return null;
  const { w, h } = appSize;
  const below = hole ? (s.placement === 'below' ? hole.y + hole.h + 180 < h : hole.y < 200) : true;
  const cardStyle: CSSProperties = hole
    ? below
      ? { top: hole.y + hole.h + GAP }
      : { bottom: h - hole.y + GAP }
    : { top: '40%' };
  // Four blockers around the hole catch every touch outside it; the hole itself lets touches through.
  const blockers: CSSProperties[] = hole
    ? [
        { left: 0, top: 0, width: w, height: Math.max(0, hole.y) },
        { left: 0, top: hole.y + hole.h, width: w, height: Math.max(0, h - hole.y - hole.h) },
        { left: 0, top: hole.y, width: Math.max(0, hole.x), height: hole.h },
        { left: hole.x + hole.w, top: hole.y, width: Math.max(0, w - hole.x - hole.w), height: hole.h },
      ]
    : [{ inset: 0 }];

  return (
    <div className="guide" ref={root}>
      {blockers.map((b, i) => (
        <div key={i} className="guide-block" style={b} />
      ))}
      {hole && <div className="guide-hole" style={{ left: hole.x, top: hole.y, width: hole.w, height: hole.h }} aria-hidden="true" />}
      <div className="guide-card" style={cardStyle} ref={card} tabIndex={-1} role="dialog" aria-labelledby="guide-t" aria-describedby="guide-b">
        <p className="guide-t" id="guide-t" aria-live="polite">
          {s.title}
        </p>
        <p className="guide-b" id="guide-b">
          {s.body}
        </p>
        <div className="guide-actions">
          <span className="guide-count">
            {step + 1} / {GUIDE_STEPS.length}
          </span>
          <button type="button" className="guide-skip" onClick={end}>
            Skip
          </button>
          <button type="button" className="guide-next" data-primary={!s.waitFor || undefined} onClick={next}>
            {step === last ? 'Finish' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
