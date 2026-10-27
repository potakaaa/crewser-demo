import { useEffect, useId, useRef, useState, type CSSProperties, type FocusEvent, type KeyboardEvent } from 'react';
import { useActiveLink, useDemo, useRoute, useUnreadCount, type TabName } from '../store';
import { Icon, type IconName } from './Icon';
import { useAddActions } from '../lib/addActions';
import { AvatarReel, SwitchPill, useSwitchGesture } from './SwitchKit';

/** Two main routes, then the crew pass: Documents, Contacts and Settings live behind your initials. */
const TABS: { name: TabName; label: string; icon: IconName }[] = [
  { name: 'dashboard', label: 'Home', icon: 'dashboard' },
  { name: 'calendar', label: 'Calendar', icon: 'calendar' },
];
/** Routes behind the crew pass: its tiles, and the label the pass slot takes while one is open. */
const PASS_ROUTES: { name: TabName; label: string; icon: IconName }[] = [
  { name: 'documents', label: 'Documents', icon: 'documents' },
  { name: 'contacts', label: 'Contacts', icon: 'contacts' },
  { name: 'settings', label: 'Settings', icon: 'settings' },
];
type Menu = 'pass' | 'add' | null;

/**
 * The dock: one compact floating capsule with Home, Calendar, your crew pass (it opens Documents, Contacts and
 * Settings) and the lime + (track time or scan an invoice). Icons only; the active one is lime with a dot.
 */
export function TabBar({ hidden }: { hidden: boolean }) {
  const route = useRoute();
  const navigate = useDemo((s) => s.navigate);
  const openSheet = useDemo((s) => s.openSheet);
  const addActions = useAddActions();
  const unread = useUnreadCount();
  const [passTurn, setPassTurn] = useState(0);
  const [passUndo, setPassUndo] = useState<string>();
  const who = useSwitchGesture<HTMLDivElement>('y', 'pass', (m) => {
    setPassUndo(m.from);
    setPassTurn((n) => n + 1);
  });
  const link = useActiveLink();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [menu, setMenu] = useState<Menu>(null);
  const menuId = useId();

  // Keep the last tab while a detail screen is on top, so the bar comes back where it left.
  const lastActive = useRef(0);
  const passLabel = PASS_ROUTES.find((r) => r.name === route.name)?.label;
  const idx = passLabel ? TABS.length : TABS.findIndex((t) => t.name === route.name);
  if (idx >= 0) lastActive.current = idx;
  const active = lastActive.current;

  // A menu never outlives the screen it was opened on.
  useEffect(() => setMenu(null), [route, hidden]);
  // Focus goes into the menu as it opens.
  useEffect(() => {
    if (menu) document.getElementById(menuId)?.querySelector<HTMLElement>('button')?.focus({ preventScroll: true });
  }, [menu, menuId]);

  const toggle = (m: Exclude<Menu, null>) => setMenu((cur) => (cur === m ? null : m));
  const close = (refocus: boolean) => {
    if (refocus) wrapRef.current?.querySelector<HTMLElement>(`[aria-controls="${menuId}"][aria-expanded="true"]`)?.focus();
    setMenu(null);
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && menu) {
      e.stopPropagation();
      close(true);
    }
  };
  // Tabbing out of the bar closes the menu, like any disclosure.
  const onBlur = (e: FocusEvent) => {
    if (menu && e.relatedTarget && !wrapRef.current?.contains(e.relatedTarget as Node)) setMenu(null);
  };
  const pick = (run: () => void) => () => {
    setMenu(null);
    run();
  };

  return (
    <>
      <div className={`tab-fade${hidden ? ' is-hidden' : ''}`} aria-hidden="true" />
      {menu && <div className="tb-scrim" aria-hidden="true" onClick={() => close(false)} />}
      <div className={`tabbar-wrap${hidden ? ' is-hidden' : ''}${menu ? ' is-open' : ''}`} inert={hidden} ref={wrapRef} onKeyDown={onKeyDown} onBlur={onBlur}>
        {menu === 'pass' && (
          <div className="tb-pass" id={menuId} role="group" aria-label="Your crew pass">
            {/* Swipe the identity row up or down to switch person, as on the Home header; the Pass stays open. */}
            <div className="tb-pass-head" ref={who.ref} {...who.handlers}>
              <AvatarReel g={who} className="tb-pass-avatar" />
              <span className="tb-pass-who">
                <strong>{link.personName}</strong>
                <span>
                  {link.position} · {link.department}
                </span>
              </span>
              {passTurn > 0 && <SwitchPill n={passTurn} kind="person" undo={passUndo} origin="pass" className="tb-pass-pill" />}
            </div>
            <div className="tb-pass-tiles">
              {PASS_ROUTES.map((r) => (
                <button type="button" key={r.name} className="tb-tile" aria-current={route.name === r.name ? 'page' : undefined} onClick={pick(() => navigate({ name: r.name }))}>
                  <Icon name={r.icon} size={22} color="currentColor" strokeWidth={1.7} />
                  <span className="tb-tile-t">{r.label}</span>
                </button>
              ))}
            </div>
            <button type="button" className="tb-pass-row" aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'} onClick={pick(() => openSheet('notifications'))}>
              <Icon name="bell" size={18} color="currentColor" strokeWidth={1.7} />
              <span>Notifications</span>
              {unread > 0 && <span className="tb-pass-count">{unread > 9 ? '9+' : unread}</span>}
              <Icon name="right" size={16} color="currentColor" />
            </button>
          </div>
        )}
        {menu === 'add' && (
          <div className="tb-dial" id={menuId} role="group" aria-label="Add">
            {addActions.map((a, k) => (
              <button type="button" key={a.id} className="tb-dial-item" style={{ '--i': k } as CSSProperties} onClick={pick(a.run)}>
                <span className="tb-dial-t">{a.label}</span>
                <span className="tb-dial-icon">
                  <Icon name={a.icon} size={20} color="currentColor" strokeWidth={1.8} />
                </span>
              </button>
            ))}
          </div>
        )}
        <nav className="dock" aria-label="Tabs">
          {TABS.map((t, i) => (
            <button
              type="button"
              key={t.name}
              className="dock-btn"
              data-on={i === active || undefined}
              aria-current={i === active && idx >= 0 ? 'page' : undefined}
              aria-label={t.label}
              onClick={() => navigate({ name: t.name })}
            >
              <Icon name={t.icon} size={22} color="currentColor" strokeWidth={i === active ? 1.9 : 1.6} />
            </button>
          ))}
          <button
            type="button"
            className="dock-btn"
            data-on={active === TABS.length || undefined}
            aria-current={passLabel ? 'page' : undefined}
            aria-label={`${passLabel ? `${passLabel}. ` : ''}Your pass: documents, contacts, settings${unread ? `, ${unread} unread notifications` : ''}`}
            aria-expanded={menu === 'pass'}
            aria-controls={menuId}
            onClick={() => toggle('pass')}
          >
            <span className="dock-avatar">
              {link.initials}
              {unread > 0 && <span className="dock-unread" aria-hidden="true" />}
            </span>
          </button>
          <button type="button" className="dock-add" aria-label="Add time or invoice" aria-expanded={menu === 'add'} aria-controls={menuId} onClick={() => toggle('add')}>
            <Icon name="plus" size={24} color="currentColor" strokeWidth={2} />
          </button>
        </nav>
      </div>
    </>
  );
}
