import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { CrewLink } from '../mock';
import { useActiveLink, useDemo } from '../store';
import { useAxisDrag } from '../lib/useAxisDrag';
import { stepTarget, switchTargets } from '../lib/switchTargets';
import { guideEmit } from '../lib/guide';

/** A swipe this far, or a flick this fast (px/ms), switches. */
const SWITCH_PX = 18;
const FLICK = 0.4;
/** How long the outgoing avatar or project line slides before the switch lands; matches .who-reel / .who-line. */
const SLIDE_MS = 200;
/** How long the confirmation pill stays; matches the fx-flash animation in nav-home.css. */
const PILL_MS = 3000;

/** Which way a gesture switch went, so the screen can turn over the same way and offer Undo. */
export interface SwitchMotion {
  kind: 'person' | 'project';
  /** 1: swiped forward (up or left), the new content comes from below or the right. */
  dir: 1 | -1;
  /** The link switched away from, for Undo. */
  from: string;
  /** Where the gesture happened; that place shows the confirmation pill, Home only turns its content over. */
  origin: 'home' | 'pass';
}

// The last gesture switch, handed from the gesture (header or Pass) to Home's turn-over. Read once, by Home.
let pending: SwitchMotion | null = null;
export const takeSwitchMotion = () => {
  const m = pending;
  pending = null;
  return m;
};

/**
 * Swipe-to-switch for an identity block. 'y' steps through the people you can act for on this project,
 * 'x' through your projects ('both' takes either, judged by the dominant direction). Expired and removed
 * links are never stepped onto (see switchTargets).
 */
export function useSwitchGesture<T extends HTMLElement>(axes: 'y' | 'both', origin: SwitchMotion['origin'], onSwitched?: (m: SwitchMotion) => void) {
  const links = useDemo((s) => s.links);
  const activeId = useDemo((s) => s.activeLinkId);
  const setActiveLink = useDemo((s) => s.setActiveLink);
  const link = useActiveLink();
  const { people, projects } = switchTargets(links, activeId);
  const nextPerson = stepTarget(people, (l) => l.id === activeId, 1);
  const prevPerson = stepTarget(people, (l) => l.id === activeId, -1);

  const switchTo = (to: CrewLink, kind: SwitchMotion['kind'], dir: 1 | -1) => {
    const m: SwitchMotion = { kind, dir, from: activeId, origin };
    pending = m;
    if (!setActiveLink(to.id)) return void (pending = null);
    guideEmit(kind === 'person' ? 'switch:person' : 'switch:project');
    onSwitched?.(m);
    try {
      navigator.vibrate?.(10); // Android only; iOS has no vibrate.
    } catch {
      /* optional */
    }
  };

  const [ay, setAy] = useState(0);
  const [lx, setLx] = useState(0);
  const [glide, setGlide] = useState(false);
  const [enter, setEnter] = useState<'left' | 'right' | null>(null);
  const drag = useAxisDrag<T>(axes, {
    onDrag: (d, axis) => {
      setGlide(false);
      if (axis === 'y') setAy(Math.max(-44, Math.min(44, people.length > 1 ? d : d * 0.25)));
      else setLx(projects.length > 1 ? d : d * 0.25);
    },
    onRelease: (d, v, cancelled, axis) => {
      setGlide(true);
      const fwd = !cancelled && (d < -SWITCH_PX || v < -FLICK);
      const back = !cancelled && !fwd && (d > SWITCH_PX || v > FLICK);
      if (axis === 'y') {
        const to = fwd ? nextPerson : back ? prevPerson : null;
        if (!to) return setAy(0);
        setAy(fwd ? -44 : 44);
        window.setTimeout(() => {
          setGlide(false);
          setAy(0);
          switchTo(to, 'person', fwd ? 1 : -1);
        }, SLIDE_MS);
      } else {
        const to = fwd || back ? stepTarget(projects, (l) => l.projectId === link.projectId, fwd ? 1 : -1) : null;
        if (!to) return setLx(0);
        setLx(fwd ? -120 : 120);
        window.setTimeout(() => {
          setGlide(false);
          setLx(0);
          setEnter(fwd ? 'right' : 'left');
          switchTo(to, 'project', fwd ? 1 : -1);
        }, SLIDE_MS);
      }
    },
  });
  return { ...drag, ay, lx, glide, enter, prevPerson, nextPerson, people, projects, link };
}

/** The avatar as a reel: the neighbours peek above and below while dragging; any switch rolls it in with a lime ring. */
/** What AvatarReel reads from useSwitchGesture. */
type ReelState = Pick<ReturnType<typeof useSwitchGesture>, 'ay' | 'glide' | 'prevPerson' | 'nextPerson' | 'link'>;

export function AvatarReel({ g, className = '' }: { g: ReelState; className?: string }) {
  const [turns, setTurns] = useState(0);
  const [seen, setSeen] = useState(g.link.id);
  if (seen !== g.link.id) {
    setSeen(g.link.id);
    setTurns((n) => n + 1);
  }
  return (
    <span className={`who-avatar ${className}`} aria-hidden="true">
      <span className="who-reel" data-glide={g.glide} style={{ '--ay': `${g.ay}px` } as CSSProperties}>
        {g.prevPerson && <span className="who-av who-av-prev">{g.prevPerson.initials}</span>}
        <span className="who-av" key={turns} data-turn={turns > 0 || undefined}>
          {g.link.initials}
        </span>
        {g.nextPerson && <span className="who-av who-av-next">{g.nextPerson.initials}</span>}
      </span>
      {turns > 0 && <span className="who-ring" key={turns} />}
    </span>
  );
}

/**
 * Who you are now, with Undo: a lime pill that stays PILL_MS, ended by a tap anywhere else or the next switch.
 * `n` changes per switch; `undo` is the link to go back to (absent for switches made without a gesture).
 */
export function SwitchPill({ n, kind, undo, origin = 'home', className = '' }: { n: number; kind: SwitchMotion['kind'] | 'fade'; undo?: string; origin?: SwitchMotion['origin']; className?: string }) {
  const link = useActiveLink();
  const setActiveLink = useDemo((s) => s.setActiveLink);
  const [shown, setShown] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  // A guide step moving on takes the pill with it: it belongs to the step that made the switch.
  const guideStep = useDemo((s) => s.guide);
  const stepAtSwitch = useRef(guideStep);
  useEffect(() => {
    if (guideStep !== stepAtSwitch.current) setShown(0);
  }, [guideStep]);
  useEffect(() => {
    if (!n) return;
    stepAtSwitch.current = useDemo.getState().guide;
    setShown(n);
    const t = window.setTimeout(() => setShown(0), PILL_MS);
    const away = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setShown(0);
    document.addEventListener('pointerdown', away);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener('pointerdown', away);
    };
  }, [n]);
  if (!n || shown !== n) return null;
  return (
    <div className={`fx-flash ${className}`} ref={ref} role="status">
      <span className="fx-flash-av" aria-hidden="true">
        {link.initials}
      </span>
      <span className="fx-flash-text">
        <strong>{kind === 'project' ? link.projectName : `${link.personName}${link.isMe ? ' (You)' : ''}`}</strong>
        <span>{kind === 'project' ? `${link.personName} · ${link.position}` : `${link.position} · ${link.projectName}`}</span>
      </span>
      {undo && (
        <button
          type="button"
          className="fx-flash-undo"
          onClick={() => {
            setShown(0);
            // Undo turns the screen back the same way, and its confirmation stays where the pill was (no second Undo).
            pending = { kind: kind === 'project' ? 'project' : 'person', dir: -1, from: '', origin };
            if (!setActiveLink(undo)) pending = null;
          }}
        >
          Undo
        </button>
      )}
    </div>
  );
}
