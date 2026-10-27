import { NOW } from '../../mock/projects';
import type { NotifKind } from '../../mock/notifications';
import { useDemo, useNotifications, useUnreadCount } from '../../store';
import { Icon, type IconName } from '../Icon';

const KIND_ICON: Record<NotifKind, IconName> = {
  callsheet: 'pdf',
  note: 'plain',
  schedule: 'calendar',
  hours: 'logTime',
  link: 'link',
};

function ago(at: string): string {
  const min = Math.max(0, Math.round((NOW - Date.parse(at)) / 60_000));
  if (min < 1) return 'Just now';
  if (min < 60) return `${min} min ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h ago`;
  const days = Math.floor(h / 24);
  return days === 1 ? 'Yesterday' : `${days} days ago`;
}

/** Sheet title, used by SheetHost. */
export const notificationsSheetMeta = () => ({ title: 'Notifications' });

/** The very important things production sent to the active crew link; tap one to read it and go there. */
export function NotificationsSheet() {
  const items = useNotifications();
  const unread = useUnreadCount();
  const markAllRead = useDemo((s) => s.markAllRead);
  const open = useDemo((s) => s.openNotification);

  if (items.length === 0) {
    return (
      <div className="notif-empty">
        <Icon name="bell" size={28} color="#9AAAAC" />
        <strong>Nothing new</strong>
        <p>Important updates from production, like a new call sheet, show up here.</p>
      </div>
    );
  }
  return (
    <>
      <div className="notif-head">
        <span className="notif-count" aria-live="polite">
          {unread > 0 ? `${unread} unread` : 'All read'}
        </span>
        <button type="button" className="notif-markall" aria-disabled={unread === 0} onClick={() => unread > 0 && markAllRead()}>
          Mark all read
        </button>
      </div>
      <ul className="notif-list" aria-label="Notifications">
        {items.map((n) => (
          <li key={n.id}>
            <button type="button" className="notif-item" data-unread={n.unread} data-kind={n.kind} onClick={() => open(n.id)}>
              <span className="notif-icon" aria-hidden="true">
                <Icon name={KIND_ICON[n.kind]} size={18} />
              </span>
              <span className="notif-text">
                <span className="notif-title">
                  {n.unread && <span className="sr-only">Unread. </span>}
                  {n.title}
                </span>
                {n.body && <span className="notif-body">{n.body}</span>}
                <span className="notif-time">{ago(n.at)}</span>
              </span>
              {n.unread && <span className="notif-dot" aria-hidden="true" />}
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
