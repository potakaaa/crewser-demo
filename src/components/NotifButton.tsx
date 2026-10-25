import { useDemo, useUnreadCount } from '../store';
import { Icon } from './Icon';

/**
 * The bell in a screen header: shows how many notifications are unread (9+ at most, nothing at 0)
 * and opens the notifications sheet. `dark` sits on the dark gradient header, `light` on a light surface.
 */
export function NotifButton({ tone = 'dark' }: { tone?: 'dark' | 'light' }) {
  const unread = useUnreadCount();
  const openSheet = useDemo((s) => s.openSheet);
  return (
    <button
      type="button"
      className={`icon-btn notif-btn ${tone === 'dark' ? 'glass-btn' : 'icon-btn-soft'}`}
      aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
      onClick={() => openSheet('notifications')}
    >
      <Icon name="bell" size={20} color={tone === 'dark' ? '#FFFFFF' : '#111A1B'} />
      {unread > 0 && (
        <span className="notif-badge" aria-hidden="true">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </button>
  );
}
