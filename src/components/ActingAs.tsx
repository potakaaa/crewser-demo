import { useActiveLink, useDemo } from '../store';
import { Icon } from './Icon';

/**
 * Shown while you enter hours for a colleague, so you never forget whose app this is.
 * Renders nothing on your own link. Tap to switch back in the project sheet.
 */
export function ActingAs() {
  const link = useActiveLink();
  const openSheet = useDemo((s) => s.openSheet);
  if (link.isMe) return null;
  return (
    <button
      type="button"
      className="actingas"
      aria-haspopup="dialog"
      aria-label={`Acting as ${link.personName}, ${link.position}. Open projects to switch.`}
      onClick={() => openSheet('project')}
    >
      <span className="actingas-av" aria-hidden="true">
        {link.initials}
      </span>
      <span className="actingas-text" aria-hidden="true">
        Acting as <strong>{link.personName}</strong> · {link.position}
      </span>
      <Icon name="right" size={16} color="currentColor" strokeWidth={1.8} />
    </button>
  );
}
