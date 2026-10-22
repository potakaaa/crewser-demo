import type { ReactNode } from 'react';
import { FONT_THEMES, useActiveLink, useDemo } from '../store';
import { links } from '../mock';
import { Icon, type IconName } from '../components/Icon';
import { GradientHeader, ScreenTitle, SectionHead, Sheet } from '../components/Layout';
import { Avatar } from '../components/contacts/Avatar';
import { usePrefs } from '../components/settings/prefs';
import { useScrollRestore } from '../lib/scroll';

const VERSION = '3.4.0';

/** Row that opens something (a sheet, a page). */
function NavRow({ icon, title, value, onClick }: { icon: IconName; title: string; value?: string; onClick: () => void }) {
  return (
    <button type="button" className="setrow" onClick={onClick}>
      <span className="chip-icon">
        <Icon name={icon} size={20} color="#2A3B3F" />
      </span>
      <span className="setrow-main">{title}</span>
      {value && <span className="setrow-value">{value}</span>}
      <Icon name="right" size={18} color="#54686C" />
    </button>
  );
}

function SwitchRow({ icon, title, hint, on, onToggle }: { icon: IconName; title: string; hint: string; on: boolean; onToggle: () => void }) {
  return (
    <button type="button" className="setrow" role="switch" aria-checked={on} onClick={onToggle}>
      <span className="chip-icon">
        <Icon name={icon} size={20} color="#2A3B3F" />
      </span>
      <span className="setrow-main">
        {title}
        <span className="setrow-hint">{hint}</span>
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
      <SectionHead title={title} sub={sub ?? ''} />
      {children}
    </section>
  );
}

export function SettingsScreen() {
  const ref = useScrollRestore<HTMLDivElement>('settings', useDemo((s) => s.setStatusDark));
  const link = useActiveLink();
  const masterDataDone = useDemo((s) => s.masterDataDone);
  const complete = useDemo((s) => s.completeMasterData);
  const fontTheme = useDemo((s) => s.fontTheme);
  const setFontTheme = useDemo((s) => s.setFontTheme);
  const openSheet = useDemo((s) => s.openSheet);
  const toast = useDemo((s) => s.showToast);
  const { callSheetOut, hoursReminder, toggle } = usePrefs();
  const validLinks = links.filter((l) => l.status !== 'expired').length;

  return (
    <div className="screen" ref={ref}>
      <div className="sat-band" aria-hidden="true" />
      <GradientHeader className="gh-compact">
        <ScreenTitle eyebrow={link.projectName} title="Settings" />
      </GradientHeader>

      <Sheet>
        <section className="setprofile" aria-label="Your profile">
          <div className="setprofile-who">
            <Avatar initials={link.initials} tint="#C0D6DB" size={56} />
            <span className="crow-text">
              <span className="setprofile-name">{link.personName}</span>
              <span className="setprofile-sub">
                {link.position} · {link.department}
              </span>
              <span className="setprofile-sub">
                {link.projectName} · {link.production}
              </span>
            </span>
          </div>
          {masterDataDone ? (
            <div className="setstatus setstatus-done">
              <Icon name="check" size={18} color="#2C6B72" strokeWidth={2} />
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
                <Icon name="idCard" size={20} color="#6B4A00" />
              </span>
              <span className="todo-titles">
                <span className="todo-t1">Complete master data</span>
                <span className="todo-t2">Payroll needs it before your first payout</span>
              </span>
              <Icon name="right" size={18} color="#54686C" />
            </button>
          )}
        </section>

        <Group title="Projects" sub="Switch between productions and people you enter hours for.">
          <div className="dlist">
            <NavRow icon="users" title="Projects & crew links" value={`${validLinks} active`} onClick={() => openSheet('project')} />
          </div>
        </Group>

        <Group title="Font" sub="Headlines and numbers. Body text stays Inter.">
          <div className="fontlist" role="radiogroup" aria-label="Font">
            {FONT_THEMES.map((f) => {
              const on = f.value === fontTheme;
              return (
                <button type="button" key={f.value} className="fontopt" role="radio" aria-checked={on} onClick={() => setFontTheme(f.value)}>
                  <span className="fontopt-sample" data-font={f.value}>
                    {f.sample}
                  </span>
                  <span className="fontopt-text">
                    <span className="fontopt-label" data-font={f.value}>
                      {f.label}
                    </span>
                    <span className="fontopt-hint">{f.hint}</span>
                  </span>
                  <span className="fontopt-check" aria-hidden="true">
                    {on && <Icon name="check" size={14} color="#DBF227" strokeWidth={2.4} />}
                  </span>
                </button>
              );
            })}
          </div>
        </Group>

        <Group title="Notifications">
          <div className="dlist">
            <SwitchRow icon="bell" title="Call sheet is out" hint="A ping when production publishes tomorrow's call sheet." on={callSheetOut} onToggle={() => toggle('callSheetOut')} />
            <SwitchRow icon="logTime" title="Reminder to submit hours" hint="A nudge at the end of the week if days are still open." on={hoursReminder} onToggle={() => toggle('hoursReminder')} />
          </div>
        </Group>

        <Group title="App">
          <div className="dlist">
            <NavRow icon="globe" title="Language" value="English" onClick={() => toast('More languages are not part of this demo')} />
            <NavRow icon="shield" title="Privacy" onClick={() => toast('The privacy policy is not part of this demo')} />
            <NavRow icon="file" title="Imprint" onClick={() => toast('The imprint is not part of this demo')} />
          </div>
          <p className="setfoot">
            <Icon name="shield" size={16} color="#54686C" />
            <span>Your data is hosted in Germany (ISO 27001).</span>
          </p>
          <p className="setfoot setfoot-version">Crewser crew app · version {VERSION} (demo)</p>
        </Group>
      </Sheet>
    </div>
  );
}
