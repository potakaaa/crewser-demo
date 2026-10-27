import { useEffect, useState, type CSSProperties } from 'react';
import type { CrewLink } from '../mock';
import { useActiveLink, useDemo } from '../store';
import { Icon } from './Icon';
import { useAxisDrag } from '../lib/useAxisDrag';
import { stepTarget, switchTargets } from '../lib/switchTargets';

/** A swipe this far, or a flick this fast (px/ms), switches. */
const SWITCH_PX = 18;
const FLICK = 0.4;
/** How long the outgoing avatar or project line slides before the switch lands; matches .who-reel / .who-line in dashboard.css. */
const SLIDE_MS = 200;
const HINT_KEY = 'crewser-who-hint';

/**
 * The Home header's who-and-where block. Tap opens the projects sheet; as shortcuts, a vertical swipe anywhere on
 * it steps through the people you can act for on this project (the avatar rolls) and a horizontal swipe steps
 * through your projects (the project line slides). Expired and removed links are never stepped onto, and every switch can be undone.
 */
/** Which way a gesture switch went, so the screen below can turn over the same way. */
export interface SwitchMotion {
  kind: 'person' | 'project';
  /** 1: swiped forward (up or left), the new content comes from below or the right. */
  dir: 1 | -1;
}

export function WhoSwitch({ onSwitch }: { onSwitch?: (m: SwitchMotion) => void }) {
  const links = useDemo((s) => s.links);
  const activeId = useDemo((s) => s.activeLinkId);
  const setActiveLink = useDemo((s) => s.setActiveLink);
  const openSheet = useDemo((s) => s.openSheet);
  const toast = useDemo((s) => s.showToast);
  const link = useActiveLink();
  const { people, projects } = switchTargets(links, activeId);
  const nextPerson = stepTarget(people, (l) => l.id === activeId, 1);
  const prevPerson = stepTarget(people, (l) => l.id === activeId, -1);
  const isHere = (l: CrewLink) => l.projectId === link.projectId;

  const switchTo = (to: CrewLink, label: string, motion: SwitchMotion) => {
    const from = activeId;
    onSwitch?.(motion);
    if (!setActiveLink(to.id)) return;
    try {
      navigator.vibrate?.(10); // Android only; iOS has no vibrate.
    } catch {
      /* optional */
    }
    toast(`Switched to ${label}`, { label: 'Undo', run: () => void setActiveLink(from) });
  };

  // Any switch (gesture, sheet or Undo) makes the avatar roll and pulse once; not on first render.
  const [turns, setTurns] = useState(0);
  const [seen, setSeen] = useState(activeId);
  if (seen !== activeId) {
    setSeen(activeId);
    setTurns((n) => n + 1);
  }

  // The whole block takes both swipes: vertical moves the avatar reel (people), horizontal the project line.
  const [ay, setAy] = useState(0);
  const [lx, setLx] = useState(0);
  const [glide, setGlide] = useState(false);
  const [enter, setEnter] = useState<'left' | 'right' | null>(null);
  const block = useAxisDrag<HTMLButtonElement>('both', {
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
          switchTo(to, to.isMe ? `${to.personName} (You)` : to.personName, { kind: 'person', dir: fwd ? 1 : -1 });
        }, SLIDE_MS);
      } else {
        const to = fwd || back ? stepTarget(projects, isHere, fwd ? 1 : -1) : null;
        if (!to) return setLx(0);
        setLx(fwd ? -120 : 120);
        window.setTimeout(() => {
          setGlide(false);
          setLx(0);
          setEnter(fwd ? 'right' : 'left');
          switchTo(to, to.projectName, { kind: 'project', dir: fwd ? 1 : -1 });
        }, SLIDE_MS);
      }
    },
  });

  // One nudge, the first time there is someone or somewhere to swipe to; never again after that.
  const [hint, setHint] = useState(false);
  const canSwipe = people.length > 1 || projects.length > 1;
  useEffect(() => {
    if (!canSwipe) return;
    try {
      if (localStorage.getItem(HINT_KEY)) return;
      localStorage.setItem(HINT_KEY, '1');
    } catch {
      return; // No storage, no way to keep it one-time: skip the hint.
    }
    const on = window.setTimeout(() => setHint(true), 1200);
    const off = window.setTimeout(() => setHint(false), 4200);
    return () => {
      window.clearTimeout(on);
      window.clearTimeout(off);
    };
  }, [canSwipe]);

  return (
    <button type="button" className="dash-who who-block" onClick={() => openSheet('project')} ref={block.ref} {...block.handlers}>
      <span className="avatar who-avatar" aria-hidden="true" data-hint={hint && people.length > 1}>
        <span className="who-reel" data-glide={glide} style={{ '--ay': `${ay}px` } as CSSProperties}>
          {prevPerson && <span className="who-av who-av-prev">{prevPerson.initials}</span>}
          <span className="who-av" key={turns} data-turn={turns > 0 || undefined}>
            {link.initials}
          </span>
          {nextPerson && <span className="who-av who-av-next">{nextPerson.initials}</span>}
        </span>
        {turns > 0 && <span className="who-ring" key={turns} />}
      </span>
      <span className="home-greet">
        {/* Who: crew who handle several people's links need to see whose hours these are. */}
        <span className="who-person" data-other={!link.isMe || undefined} key={link.id}>
          {link.personName}
        </span>
        <span className="home-project who-line-zone">
          <span
            key={link.projectId}
            className="who-line"
            data-glide={glide}
            data-enter={enter ?? undefined}
            data-hint={hint && projects.length > 1}
            style={{ '--lx': `${lx}px`, opacity: 1 - Math.min(1, Math.abs(lx) / 160) } as CSSProperties}
          >
            <span className="who-name">{link.projectName}</span>
            <Icon name="down" size={16} color="#C4CFD0" strokeWidth={2} />
          </span>
          <span className="sr-only">{link.isMe ? '' : `. Entering hours for ${link.personName}, ${link.position}`}. Switch person or project</span>
        </span>
      </span>
    </button>
  );
}
