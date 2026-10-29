import { useActiveLink, useDemo, useUnreadCount } from '../store';
import { Icon } from './Icon';
import { guideEmit } from '../lib/guide';

/**
 * The Home header's who-and-where block, then Notifications and the switch arrow. The arrow opens the projects
 * sheet (ProjectSwitcher), where every crew link on this phone can be picked, yours or a colleague's.
 */
export function WhoSwitch() {
  const openSheet = useDemo((s) => s.openSheet);
  const link = useActiveLink();
  const unread = useUnreadCount();

  return (
    <>
      <div className="dash-who who-block">
        <span className="avatar" aria-hidden="true">
          {link.initials}
        </span>
        <span className="home-greet">
          {/* Who: crew who handle several people's links need to see whose hours these are. */}
          <span className="who-person" data-other={!link.isMe || undefined}>
            {link.personName}
          </span>
          <span className="home-project">
            <span className="who-name">{link.projectName}</span>
          </span>
          {!link.isMe && (
            <span className="sr-only">
              Entering hours for {link.personName}, {link.position}
            </span>
          )}
        </span>
      </div>
      <button type="button" className="glass-btn home-icon-btn" aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'} onClick={() => openSheet('notifications')}>
        <Icon name="bell" size={20} color="currentColor" strokeWidth={1.7} />
        {unread > 0 && <span className="home-icon-dot" aria-hidden="true" />}
      </button>
      <button
        type="button"
        className="glass-btn home-icon-btn"
        data-guide="switch"
        aria-label="Switch project or person"
        onClick={() => {
          openSheet('project');
          guideEmit('switch:opened');
        }}
      >
        <Icon name="down" size={22} color="currentColor" strokeWidth={2} />
      </button>
    </>
  );
}
