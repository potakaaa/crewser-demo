import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type FocusEvent, type KeyboardEvent, type ReactNode } from 'react';
import { contacts, today } from '../mock';
import { useActiveLink, useDemo, useRoute, useUnreadCount, type TabName } from '../store';
import { Icon, type IconName } from './Icon';
import { useAddActions } from '../lib/addActions';

/** Three main routes, then the crew pass: Contacts and Settings live behind your initials. */
const TABS: { name: TabName; label: string; icon: IconName }[] = [
  { name: 'dashboard', label: 'Home', icon: 'dashboard' },
  { name: 'calendar', label: 'Calendar', icon: 'calendar' },
  { name: 'documents', label: 'Docs', icon: 'documents' },
];
/** Routes behind the crew pass: its tiles, and the label the pass slot takes while one is open. */
const PASS_ROUTES: { name: TabName; label: string; hint: string; icon: IconName }[] = [
  { name: 'contacts', label: 'Contacts', hint: `${contacts.length} crew`, icon: 'contacts' },
  { name: 'settings', label: 'Settings', hint: 'Preferences', icon: 'settings' },
];
const SLOTS = TABS.length + 1;

const ICON = 22;
const PAD_L = 8;
const PAD_R = 8;
/** Matches `margin-left` on `.tab-label` in app.css; change them together. */
const LABEL_GAP = 6;
/** Inactive tabs never get narrower than this; if the label would squeeze them, the active tab goes icon-only. */
const MIN_TAB = 40;

interface Layout {
  w: number[];
  x: number[];
  /** False on narrow phones: all tabs are equal, icon-only. */
  label: boolean;
}

type Menu = 'pass' | 'add' | null;

/**
 * Floating tab bar. One white pill slides to the active tab while that tab widens to show its label;
 * widths are computed up front so pill, icons and label move on the same curve. The last slot is your
 * crew pass, which opens Contacts and Settings; the lime + beside the bar adds time or an invoice.
 */
export function TabBar({ hidden }: { hidden: boolean }) {
  const route = useRoute();
  const navigate = useDemo((s) => s.navigate);
  const openSheet = useDemo((s) => s.openSheet);
  const addActions = useAddActions();
  const unread = useUnreadCount();
  const link = useActiveLink();
  const navRef = useRef<HTMLElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const labelRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const [layout, setLayout] = useState<Layout | null>(null);
  const [menu, setMenu] = useState<Menu>(null);
  const menuId = useId();

  // Keep the last tab while a detail screen is on top, so the bar comes back where it left.
  const lastActive = useRef(0);
  const passLabel = PASS_ROUTES.find((r) => r.name === route.name)?.label;
  const idx = passLabel ? TABS.length : TABS.findIndex((t) => t.name === route.name);
  if (idx >= 0) lastActive.current = idx;
  const active = lastActive.current;
  const lastPass = useRef('Contacts');
  if (passLabel) lastPass.current = passLabel;

  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const measure = () => {
      const cs = getComputedStyle(nav);
      const padL = parseFloat(cs.paddingLeft);
      const inner = nav.clientWidth - padL - parseFloat(cs.paddingRight);
      const gap = parseFloat(cs.columnGap) || 0;
      const widths = labelRefs.current.map((el) => el?.scrollWidth ?? 0);
      // Labels not laid out yet (fonts, first paint): a max of 0 would wrongly switch the label mode on. The font and resize hooks measure again.
      if (Math.max(...widths) <= 0) return;
      const room = inner - gap * (SLOTS - 1);
      const pill = (labelW: number) => PAD_L + ICON + LABEL_GAP + labelW + PAD_R;
      // The label mode is decided by the longest label, so every tab behaves the same on a given phone.
      const label = (room - pill(Math.max(...widths))) / (SLOTS - 1) >= MIN_TAB;
      let activeW = pill(widths[active]);
      let otherW = (room - activeW) / (SLOTS - 1);
      if (!label) activeW = otherW = room / SLOTS;
      const w = Array.from({ length: SLOTS }, (_, i) => (i === active ? activeW : otherW));
      const x: number[] = [];
      w.reduce((acc, v) => (x.push(acc), acc + v + gap), padL);
      setLayout({ w, x, label });
    };
    measure();
    void document.fonts?.ready.then(measure);
    const ro = new ResizeObserver(measure);
    ro.observe(nav);
    return () => ro.disconnect();
  }, [active, passLabel]);

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

  const slotStyle = (i: number): CSSProperties | undefined =>
    layout ? { width: layout.w[i], paddingLeft: i === active && layout.label ? PAD_L : (layout.w[i] - ICON) / 2 } : undefined;
  const slot = (i: number, label: string, icon: ReactNode, props: { onClick: () => void; ariaLabel: string; current: boolean; menu?: boolean; title?: string }) => {
    const on = i === active;
    return (
      <button
        type="button"
        key={i}
        className="tab"
        style={slotStyle(i)}
        aria-current={props.current ? 'page' : undefined}
        aria-label={props.ariaLabel}
        aria-expanded={props.menu ? menu === 'pass' : undefined}
        aria-controls={props.menu ? menuId : undefined}
        title={on ? undefined : (props.title ?? label)}
        onClick={props.onClick}
      >
        <span className="tab-icon">{icon}</span>
        <span className="tab-label" aria-hidden="true" ref={(el) => void (labelRefs.current[i] = el)} data-on={on && (layout?.label ?? true)}>
          {label}
        </span>
      </button>
    );
  };

  return (
    <>
      <div className={`tab-fade${hidden ? ' is-hidden' : ''}`} aria-hidden="true" />
      {menu && <div className="tb-scrim" aria-hidden="true" onClick={() => close(false)} />}
      <div className={`tabbar-wrap${hidden ? ' is-hidden' : ''}${menu ? ' is-open' : ''}`} inert={hidden} ref={wrapRef} onKeyDown={onKeyDown} onBlur={onBlur}>
        {menu === 'pass' && (
          <div className="tb-pass" id={menuId} role="group" aria-label="Your crew pass">
            <div className="tb-pass-head">
              <span className="tb-pass-avatar" aria-hidden="true">
                {link.initials}
              </span>
              <span className="tb-pass-who">
                <strong>{link.personName}</strong>
                <span>
                  {link.position} · {link.department}
                </span>
              </span>
              <span className="tb-pass-day num" aria-label={`Shoot day ${today.shootDay}`}>
                D{today.shootDay}
              </span>
            </div>
            <div className="tb-pass-tiles">
              {PASS_ROUTES.map((r) => (
                <button type="button" key={r.name} className="tb-tile" aria-current={route.name === r.name ? 'page' : undefined} onClick={pick(() => navigate({ name: r.name }))}>
                  <Icon name={r.icon} size={22} color="currentColor" strokeWidth={1.7} />
                  <span className="tb-tile-t">{r.label}</span>
                  <span className="tb-tile-s">{r.hint}</span>
                </button>
              ))}
            </div>
            <button type="button" className="tb-pass-row" aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'} onClick={pick(() => openSheet('notifications'))}>
              <Icon name="bell" size={18} color="currentColor" strokeWidth={1.7} />
              <span>Notifications</span>
              {unread > 0 && <span className="tb-pass-count">{unread > 9 ? '9+' : unread}</span>}
              <Icon name="right" size={16} color="currentColor" />
            </button>
            <button type="button" className="tb-pass-row" aria-label={`${link.projectName}. Switch project`} onClick={pick(() => openSheet('project'))}>
              <Icon name="users" size={18} color="currentColor" strokeWidth={1.7} />
              <span>{link.projectName}</span>
              <span className="tb-pass-row-s">Switch</span>
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
        <nav className={`tabbar${layout ? ' is-measured' : ''}`} aria-label="Tabs" ref={navRef}>
          {layout && <span className="tab-pill" aria-hidden="true" style={{ width: layout.w[active], transform: `translateX(${layout.x[active]}px)` }} />}
          {TABS.map((t, i) =>
            slot(i, t.label, <Icon name={t.icon} size={ICON} color={i === active ? 'currentColor' : '#9AAAAC'} strokeWidth={i === active ? 1.8 : 1.6} />, {
              onClick: () => navigate({ name: t.name }),
              ariaLabel: t.label,
              current: i === active && idx >= 0,
            }),
          )}
          {slot(
            TABS.length,
            lastPass.current,
            <span className="tab-avatar" data-on={active === TABS.length}>
              {link.initials}
            </span>,
            {
              onClick: () => toggle('pass'),
              ariaLabel: passLabel ? `${passLabel}. Your pass: contacts, settings, projects` : 'Your pass: contacts, settings, projects',
              current: !!passLabel,
              menu: true,
              title: 'Your pass',
            },
          )}
        </nav>
        <button
          type="button"
          className="add-btn"
          aria-label="Add time or invoice"
          aria-expanded={menu === 'add'}
          aria-controls={menuId}
          onClick={() => toggle('add')}
        >
          <Icon name="plus" size={26} color="currentColor" strokeWidth={2} />
        </button>
      </div>
    </>
  );
}
