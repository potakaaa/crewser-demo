import type { CSSProperties } from 'react';
import { useDemo } from '../store';
import { Icon } from './Icon';
import { AvatarReel, useSwitchGesture } from './SwitchKit';

/**
 * The Home header's who-and-where block. Tap opens the projects sheet; as shortcuts, a vertical swipe anywhere on
 * it steps through the people you can act for on this project (the avatar rolls) and a horizontal swipe steps
 * through your projects (the project line slides). Expired and removed links are never stepped onto, and every switch can be undone.
 */
export function WhoSwitch() {
  const openSheet = useDemo((s) => s.openSheet);
  const g = useSwitchGesture<HTMLButtonElement>('both', 'home');
  const { link, lx, glide, enter } = g;

  return (
    <button type="button" className="dash-who who-block" data-guide="who" onClick={() => openSheet('project')} ref={g.ref} {...g.handlers}>
      <AvatarReel g={g} className="avatar" />
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
