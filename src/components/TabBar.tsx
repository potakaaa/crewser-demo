import { useRef } from 'react';
import { isTab, useActiveLink, useDemo, useRoute, type TabName } from '../store';
import { Icon, type IconName } from './Icon';

const TABS: { name: TabName; label: string; icon: IconName }[] = [
  { name: 'dashboard', label: 'Home', icon: 'dashboard' },
  { name: 'calendar', label: 'Calendar', icon: 'calendar' },
  { name: 'documents', label: 'Documents', icon: 'documents' },
  { name: 'contacts', label: 'Contacts', icon: 'contacts' },
];

/** The dock: Home, Calendar, Documents, Contacts, then your initials (Settings) at the far right. Full width, docked to the bottom. */
export function TabBar({ hidden }: { hidden: boolean }) {
  const route = useRoute();
  const navigate = useDemo((s) => s.navigate);
  const link = useActiveLink();

  // Keep the last tab while a detail screen is on top, so the bar comes back where it left.
  const lastActive = useRef<TabName>('dashboard');
  if (isTab(route)) lastActive.current = route.name;
  const active = lastActive.current;
  const onTab = isTab(route);

  return (
    <div className={`tabbar-wrap${hidden ? ' is-hidden' : ''}`} inert={hidden}>
      <nav className="dock" aria-label="Tabs">
        {TABS.map((t) => (
          <button
            type="button"
            key={t.name}
            className="dock-btn"
            data-on={t.name === active || undefined}
            aria-current={t.name === active && onTab ? 'page' : undefined}
            aria-label={t.label}
            data-guide={t.name === 'documents' ? 'documents' : undefined}
            onClick={() => navigate({ name: t.name })}
          >
            <Icon name={t.icon} size={22} color="currentColor" strokeWidth={t.name === active ? 1.9 : 1.6} />
          </button>
        ))}
        <button
          type="button"
          className="dock-btn"
          data-on={active === 'settings' || undefined}
          aria-current={active === 'settings' && onTab ? 'page' : undefined}
          aria-label="Profile and settings"
          onClick={() => navigate({ name: 'settings' })}
        >
          <span className="dock-avatar">{link.initials}</span>
        </button>
      </nav>
    </div>
  );
}
