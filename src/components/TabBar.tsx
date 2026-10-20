import { useDemo, useRoute, type TabName } from '../store';
import { Icon, type IconName } from './Icon';

const TABS: { name: TabName; label: string; icon: IconName }[] = [
  { name: 'home', label: 'Home', icon: 'home' },
  { name: 'calendar', label: 'Calendar', icon: 'calendar' },
  { name: 'stats', label: 'Stats', icon: 'stats' },
];

export function TabBar() {
  const route = useRoute();
  const navigate = useDemo((s) => s.navigate);
  const openLog = useDemo((s) => s.setLogOpen);
  return (
    <>
      <div className="tab-fade" aria-hidden="true" />
      <div className="tabbar-wrap">
        <nav className="tabbar" aria-label="Tabs">
          {TABS.map((t) => {
            const on = route.name === t.name;
            return (
              <button
                type="button"
                key={t.name}
                className="tab"
                aria-current={on ? 'page' : undefined}
                aria-label={t.label}
                title={on ? undefined : t.label}
                onClick={() => navigate({ name: t.name })}
              >
                <Icon name={t.icon} size={22} color={on ? '#111A1B' : '#3F5155'} strokeWidth={on ? 1.8 : 1.6} />
                <span className="tab-label" aria-hidden="true">
                  {t.label}
                </span>
              </button>
            );
          })}
        </nav>
        <button type="button" className="log-btn" aria-label="Log today's hours" aria-haspopup="dialog" onClick={() => openLog(true)} id="log-button">
          <Icon name="logTime" size={22} color="#111A1B" strokeWidth={1.7} />
          <span>Log</span>
        </button>
      </div>
    </>
  );
}
