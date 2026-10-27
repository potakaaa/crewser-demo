import { useEffect, useState, type CSSProperties } from 'react';
import { useDemo } from '../store';
import { Icon } from './Icon';
import { AvatarReel, useSwitchGesture } from './SwitchKit';

const HINT_KEY = 'crewser-who-hint';

/**
 * The Home header's who-and-where block. Tap opens the projects sheet; as shortcuts, a vertical swipe anywhere on
 * it steps through the people you can act for on this project (the avatar rolls) and a horizontal swipe steps
 * through your projects (the project line slides). Expired and removed links are never stepped onto, and every switch can be undone.
 */
export function WhoSwitch() {
  const openSheet = useDemo((s) => s.openSheet);
  const g = useSwitchGesture<HTMLButtonElement>('both', 'home');
  const { link, people, projects, lx, glide, enter } = g;

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
    <button type="button" className="dash-who who-block" onClick={() => openSheet('project')} ref={g.ref} {...g.handlers}>
      <AvatarReel g={g} className="avatar" hint={hint && people.length > 1} />
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
