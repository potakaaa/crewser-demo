import { useEffect, useState, type CSSProperties } from 'react';
import { person, today, type CrewLink } from '../mock';
import { useActiveLink, useDemo } from '../store';
import { Icon } from './Icon';
import { ForChip } from './ForChip';
import { greeting } from '../lib/greeting';
import { useAxisDrag } from '../lib/useAxisDrag';
import { stepTarget, switchTargets } from '../lib/switchTargets';

/** A swipe this far, or a flick this fast (px/ms), switches. */
const SWITCH_PX = 18;
const FLICK = 0.4;
/** How long the outgoing avatar or project line slides before the switch lands; matches .who-reel / .who-line in dashboard.css. */
const SLIDE_MS = 200;
const HINT_KEY = 'crewser-who-hint';

/**
 * The Home header's who-and-where button. Tap opens the projects sheet; as shortcuts, a vertical swipe on the
 * avatar steps through the people you can act for on this project and a horizontal swipe on the project line
 * steps through your projects. Expired and removed links are never stepped onto, and every switch can be undone.
 */
export function WhoSwitch() {
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

  const switchTo = (to: CrewLink, label: string) => {
    const from = activeId;
    if (!setActiveLink(to.id)) return;
    toast(`Switched to ${label}`, { label: 'Undo', run: () => void setActiveLink(from) });
  };

  // Avatar: the reel follows the finger, then slides a whole avatar before the switch lands.
  const [ay, setAy] = useState(0);
  const [aGlide, setAGlide] = useState(false);
  const avatar = useAxisDrag<HTMLSpanElement>('y', {
    onDrag: (dy) => {
      setAGlide(false);
      setAy(Math.max(-44, Math.min(44, people.length > 1 ? dy : dy * 0.25)));
    },
    onRelease: (dy, v, cancelled) => {
      setAGlide(true);
      const to = !cancelled && (dy < -SWITCH_PX || v < -FLICK ? nextPerson : dy > SWITCH_PX || v > FLICK ? prevPerson : null);
      if (!to) return setAy(0);
      setAy(dy < 0 ? -44 : 44);
      window.setTimeout(() => {
        setAGlide(false);
        setAy(0);
        switchTo(to, to.isMe ? 'your own link' : to.personName);
      }, SLIDE_MS);
    },
  });

  // Project line: slides sideways, the next project comes in from the side it was pulled from.
  const [lx, setLx] = useState(0);
  const [lGlide, setLGlide] = useState(false);
  const [enter, setEnter] = useState<'left' | 'right' | null>(null);
  const line = useAxisDrag<HTMLSpanElement>('x', {
    onDrag: (dx) => {
      setLGlide(false);
      setLx(projects.length > 1 ? dx : dx * 0.25);
    },
    onRelease: (dx, v, cancelled) => {
      setLGlide(true);
      const fwd = dx < -SWITCH_PX || v < -FLICK;
      const back = dx > SWITCH_PX || v > FLICK;
      const to = !cancelled && (fwd || back) ? stepTarget(projects, isHere, fwd ? 1 : -1) : null;
      if (!to) return setLx(0);
      setLx(fwd ? -120 : 120);
      window.setTimeout(() => {
        setLGlide(false);
        setLx(0);
        setEnter(fwd ? 'right' : 'left');
        switchTo(to, to.projectName);
      }, SLIDE_MS);
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
    <button type="button" className="dash-who" onClick={() => openSheet('project')}>
      <span className="avatar who-avatar" aria-hidden="true" ref={avatar.ref} {...avatar.handlers} data-hint={hint && people.length > 1}>
        <span className="who-reel" data-glide={aGlide} style={{ '--ay': `${ay}px` } as CSSProperties}>
          {prevPerson && <span className="who-av who-av-prev">{prevPerson.initials}</span>}
          <span className="who-av">{link.initials}</span>
          {nextPerson && <span className="who-av who-av-next">{nextPerson.initials}</span>}
        </span>
      </span>
      <span className="home-greet">
        {link.isMe ? (
          <span className="home-hello">
            {greeting()}, {person.firstName}
          </span>
        ) : (
          <ForChip />
        )}
        <span className="home-project who-line-zone" ref={line.ref} {...line.handlers}>
          <span
            key={link.projectId}
            className="who-line"
            data-glide={lGlide}
            data-enter={enter ?? undefined}
            data-hint={hint && projects.length > 1}
            style={{ '--lx': `${lx}px`, opacity: 1 - Math.min(1, Math.abs(lx) / 160) } as CSSProperties}
          >
            {link.projectName} · Shoot day {today.shootDay}
            <Icon name="down" size={14} color="#C4CFD0" strokeWidth={2} />
          </span>
          <span className="sr-only">. Switch project</span>
        </span>
      </span>
    </button>
  );
}
