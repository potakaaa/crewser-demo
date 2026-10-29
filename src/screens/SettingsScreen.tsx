import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { FONT_THEMES, type FontTheme, useActiveLink, useDemo, useUnreadCount } from '../store';
import { Icon } from '../components/Icon';
import { GradientHeader, ScreenTitle, SectionHead, Sheet } from '../components/Layout';
import { Avatar } from '../components/contacts/Avatar';
import { usePrefs } from '../components/settings/prefs';
import { useScrollRestore } from '../lib/scroll';

const VERSION = '3.4.0';

/** Row that opens something (a sheet, a page). */
function NavRow({ title, value, onClick }: { title: string; value?: string; onClick: () => void }) {
  return (
    <button type="button" className="setrow" onClick={onClick}>
      <span className="setrow-main">{title}</span>
      {value && <span className="setrow-value">{value}</span>}
      <Icon name="right" size={18} color="#9AAAAC" />
    </button>
  );
}

function SwitchRow({ title, hint, on, onToggle }: { title: string; hint: string; on: boolean; onToggle: () => void }) {
  const id = useId();
  return (
    <button type="button" className="setrow" role="switch" aria-checked={on} aria-labelledby={`${id}-t`} aria-describedby={`${id}-h`} onClick={onToggle}>
      <span className="setrow-main">
        <span id={`${id}-t`}>{title}</span>
        <span className="setrow-hint" id={`${id}-h`}>
          {hint}
        </span>
      </span>
      <span className="switch" aria-hidden="true">
        <i />
      </span>
    </button>
  );
}

function Group({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) {
  return (
    <section className="stack" aria-label={title}>
      <SectionHead title={title} sub={sub} />
      {children}
    </section>
  );
}

/** Listbox rather than <select>: each option is drawn in its own typeface. */
function FontSelect({ value, onChange }: { value: FontTheme; onChange: (v: FontTheme) => void }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const id = useId();
  const current = FONT_THEMES.find((f) => f.value === value) ?? FONT_THEMES[0];

  useEffect(() => {
    if (!open) return;
    root.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.focus();
    root.current?.querySelector('.fontsel-list')?.scrollIntoView({ block: 'nearest' });
    const away = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', away);
    return () => document.removeEventListener('pointerdown', away);
  }, [open]);

  const close = () => {
    setOpen(false);
    btn.current?.focus();
  };
  const pick = (v: FontTheme) => {
    onChange(v);
    close();
  };
  const onListKey = (e: KeyboardEvent<HTMLUListElement>) => {
    const items = [...e.currentTarget.querySelectorAll<HTMLElement>('[role="option"]')];
    const i = items.indexOf(document.activeElement as HTMLElement);
    const go = (n: number) => items[(n + items.length) % items.length]?.focus();
    if (e.key === 'ArrowDown') go(i + 1);
    else if (e.key === 'ArrowUp') go(i - 1);
    else if (e.key === 'Home') go(0);
    else if (e.key === 'End') go(items.length - 1);
    else if (e.key === 'Escape') close();
    else if (e.key === 'Enter' || e.key === ' ') pick(FONT_THEMES[i].value);
    else if (e.key === 'Tab') setOpen(false);
    else return;
    if (e.key !== 'Tab') e.preventDefault();
  };

  return (
    <div className="fontsel" ref={root}>
      <button
        ref={btn}
        type="button"
        className="fontsel-btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            setOpen(true);
          }
        }}
      >
        <FontOption f={current} />
        <Icon name="down" size={18} color="currentColor" />
      </button>
      {open && (
        <ul className="fontsel-list" id={`${id}-list`} role="listbox" aria-label="Font" onKeyDown={onListKey}>
          {FONT_THEMES.map((f) => (
            <li key={f.value} role="option" tabIndex={-1} aria-selected={f.value === value} className="fontsel-opt" onClick={() => pick(f.value)}>
              <FontOption f={f} />
              {f.value === value && <Icon name="check" size={16} color="currentColor" strokeWidth={2.4} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FontOption({ f }: { f: (typeof FONT_THEMES)[number] }) {
  return (
    <>
      <span className="fontopt-sample" data-font={f.value}>
        {f.sample}
      </span>
      <span className="fontopt-text">
        <span className="fontopt-label" data-font={f.value}>
          {f.label}
        </span>
        <span className="fontopt-hint">{f.hint}</span>
      </span>
    </>
  );
}

export function SettingsScreen() {
  const ref = useScrollRestore<HTMLDivElement>('settings', useDemo((s) => s.setStatusDark));
  const link = useActiveLink();
  const links = useDemo((s) => s.links);
  // The profile is always you, on the project you are looking at; the banner covers acting for someone else.
  const own = links.find((l) => l.isMe && l.projectId === link.projectId) ?? links.find((l) => l.isMe) ?? link;
  const setActiveLink = useDemo((s) => s.setActiveLink);
  const masterDataDone = useDemo((s) => s.masterDataDone);
  const complete = useDemo((s) => s.completeMasterData);
  const fontTheme = useDemo((s) => s.fontTheme);
  const setFontTheme = useDemo((s) => s.setFontTheme);
  const openSheet = useDemo((s) => s.openSheet);
  const startGuide = useDemo((s) => s.startGuide);
  const toast = useDemo((s) => s.showToast);
  const unread = useUnreadCount();
  const { callSheetOut, hoursReminder, toggle } = usePrefs();

  return (
    <div className="screen" ref={ref}>
      <div className="sat-band" aria-hidden="true" />
      <GradientHeader className="gh-compact">
        <ScreenTitle eyebrow={link.projectName} title="Settings" />
      </GradientHeader>

      <Sheet className="sheet-compact">
        {!link.isMe && (
          <section className="setbanner" aria-label="Acting for a colleague">
            <span className="setbanner-text">
              <strong>Entering hours for {link.personName}</strong>
              <span>
                {link.position} · {link.projectName}. Your own profile is below.
              </span>
            </span>
            <button
              type="button"
              className="btn btn-glass setbanner-btn"
              onClick={() => {
                // Refuses an expired or revoked link with its own toast.
                if (setActiveLink(own.id)) toast(`Switched to ${own.projectName}`);
              }}
            >
              Back to me
            </button>
          </section>
        )}
        <section className="setprofile" aria-label="Your profile">
          <div className="setprofile-who">
            <Avatar initials={own.initials} tint="#C0D6DB" size={44} />
            <span className="crow-text">
              <span className="setprofile-name">{own.personName}</span>
              <span className="setprofile-sub">
                {own.position} · {own.department}
              </span>
              <span className="setprofile-sub">
                {own.projectName} · {own.production}
              </span>
            </span>
          </div>
          {masterDataDone ? (
            <div className="setstatus setstatus-done">
              <Icon name="check" size={18} color="#8FD0C6" strokeWidth={2} />
              Master data complete
            </div>
          ) : (
            <button
              type="button"
              className="todo-row setstatus-todo"
              onClick={() => {
                complete();
                toast('Master data submitted (demo)');
              }}
            >
              <span className="todo-icon">
                <Icon name="idCard" size={20} color="#F4C35A" />
              </span>
              <span className="todo-titles">
                <span className="todo-t1">Complete master data</span>
                <span className="todo-t2">Needed before your first payout</span>
              </span>
              <Icon name="right" size={18} color="#9AAAAC" />
            </button>
          )}
        </section>

        <Group title="Notifications">
          <div className="dlist">
            <NavRow title="Notifications" value={unread ? `${unread} unread` : undefined} onClick={() => openSheet('notifications')} />
            <SwitchRow title="Call sheet is out" hint="When tomorrow's call sheet is out" on={callSheetOut} onToggle={() => toggle('callSheetOut')} />
            <SwitchRow title="Reminder to submit hours" hint="When days are still open at week's end" on={hoursReminder} onToggle={() => toggle('hoursReminder')} />
          </div>
        </Group>

        <Group title="App">
          <div className="dlist">
            <NavRow title="Projects & crew links" value={`${links.length} links`} onClick={() => openSheet('project')} />
            <NavRow title="Show the guide again" onClick={startGuide} />
            <NavRow title="Language" value="English" onClick={() => toast('More languages are not part of this demo')} />
          </div>
          <FontSelect value={fontTheme} onChange={setFontTheme} />
        </Group>

        <Group title="Legal">
          <div className="dlist">
            <NavRow title="Privacy" onClick={() => toast('The privacy policy is not part of this demo')} />
            <NavRow title="Imprint" onClick={() => toast('The imprint is not part of this demo')} />
          </div>
          <p className="setfoot">
            <Icon name="shield" size={16} color="#9AAAAC" />
            <span>Data hosted in Germany</span>
          </p>
          <p className="setfoot setfoot-version">Crewser crew app · version {VERSION} (demo)</p>
        </Group>
      </Sheet>
    </div>
  );
}
