import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { useDemo, useRoute, type TabName } from '../store';
import { Icon, type IconName } from './Icon';

const TABS: { name: TabName; label: string; icon: IconName }[] = [
  { name: 'dashboard', label: 'Home', icon: 'dashboard' },
  { name: 'calendar', label: 'Calendar', icon: 'calendar' },
  { name: 'documents', label: 'Docs', icon: 'documents' },
  { name: 'contacts', label: 'Contacts', icon: 'contacts' },
  { name: 'settings', label: 'Settings', icon: 'settings' },
];

/** Full names for screen readers; the visible label is the short one. */
const ARIA: Record<TabName, string> = {
  dashboard: 'Dashboard',
  calendar: 'Calendar',
  documents: 'Documents',
  contacts: 'Contacts',
  settings: 'Settings',
};

// Five tabs plus the Log button have to fit a 375 px phone, so the active tab stays compact.
const ICON = 22;
const PAD_L = 12;
const PAD_R = 12;
const LABEL_GAP = 6;

interface Layout {
  w: number[];
  x: number[];
}

/**
 * Floating tab bar. One white pill slides to the active tab while that tab widens
 * to show its label; widths are computed up front so pill, icons and label move
 * on the same curve instead of chasing each other.
 */
export function TabBar({ hidden }: { hidden: boolean }) {
  const route = useRoute();
  const navigate = useDemo((s) => s.navigate);
  const openLog = useDemo((s) => s.setLogOpen);
  const navRef = useRef<HTMLElement>(null);
  const labelRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const [layout, setLayout] = useState<Layout | null>(null);

  // Keep the last tab while a detail screen is on top, so the bar comes back where it left.
  const lastActive = useRef(0);
  const idx = TABS.findIndex((t) => t.name === route.name);
  if (idx >= 0) lastActive.current = idx;
  const active = lastActive.current;

  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const measure = () => {
      const cs = getComputedStyle(nav);
      const padL = parseFloat(cs.paddingLeft);
      const inner = nav.clientWidth - padL - parseFloat(cs.paddingRight);
      const gap = parseFloat(cs.columnGap) || 0;
      const labelW = labelRefs.current[active]?.scrollWidth ?? 60;
      const activeW = PAD_L + ICON + LABEL_GAP + labelW + PAD_R;
      const otherW = (inner - activeW - gap * (TABS.length - 1)) / (TABS.length - 1);
      const w = TABS.map((_, i) => (i === active ? activeW : otherW));
      const x: number[] = [];
      w.reduce((acc, v) => (x.push(acc), acc + v + gap), padL);
      setLayout({ w, x });
    };
    measure();
    void document.fonts?.ready.then(measure);
    const ro = new ResizeObserver(measure);
    ro.observe(nav);
    return () => ro.disconnect();
  }, [active]);

  return (
    <>
      <div className={`tab-fade${hidden ? ' is-hidden' : ''}`} aria-hidden="true" />
      <div className={`tabbar-wrap${hidden ? ' is-hidden' : ''}`} inert={hidden}>
        <nav className={`tabbar${layout ? ' is-measured' : ''}`} aria-label="Tabs" ref={navRef}>
          {layout && (
            <span
              className="tab-pill"
              aria-hidden="true"
              style={{ width: layout.w[active], transform: `translateX(${layout.x[active]}px)` }}
            />
          )}
          {TABS.map((t, i) => {
            const on = i === active;
            const style: CSSProperties | undefined = layout
              ? { width: layout.w[i], paddingLeft: on ? PAD_L : (layout.w[i] - ICON) / 2 }
              : undefined;
            return (
              <button
                type="button"
                key={t.name}
                className="tab"
                style={style}
                aria-current={on && idx >= 0 ? 'page' : undefined}
                aria-label={ARIA[t.name]}
                title={on ? undefined : ARIA[t.name]}
                onClick={() => navigate({ name: t.name })}
              >
                <span className="tab-icon">
                  <Icon name={t.icon} size={ICON} color={on ? '#111A1B' : '#3F5155'} strokeWidth={on ? 1.8 : 1.6} />
                </span>
                <span className="tab-label" aria-hidden="true" ref={(el) => void (labelRefs.current[i] = el)} data-on={on}>
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
