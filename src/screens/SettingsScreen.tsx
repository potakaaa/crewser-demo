import { useId, type ReactNode } from 'react';
import { FONT_THEMES, useActiveLink, useDemo } from '../store';
import { Icon, type IconName } from '../components/Icon';
import { TimerChip } from '../components/TimerChip';
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
        <Icon name={icon} size={20} color="currentColor" />
      </span>
      <span className="setrow-main">{title}</span>
      {value && <span className="setrow-value">{value}</span>}
      <Icon name="right" size={18} color="#9AAAAC" />
    </button>
  );
}

function SwitchRow({ icon, title, hint, on, onToggle }: { icon: IconName; title: string; hint: string; on: boolean; onToggle: () => void }) {
  const id = useId();
  return (
    <button type="button" className="setrow" role="switch" aria-checked={on} aria-labelledby={`${id}-t`} aria-describedby={`${id}-h`} onClick={onToggle}>
      <span className="chip-icon">
        <Icon name={icon} size={20} color="currentColor" />
      </span>
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
  const { callSheetOut, hoursReminder, toggle } = usePrefs();

  return (
    <div className="screen" ref={ref}>
      <div className="sat-band" aria-hidden="true" />
      <GradientHeader className="gh-compact">
        <ScreenTitle eyebrow={link.projectName} title="Settings">
          <TimerChip />
        </ScreenTitle>
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

        <Group title="Projects">
          <div className="dlist">
            <NavRow icon="users" title="Projects & crew links" value={`${links.length} links`} onClick={() => openSheet('project')} />
          </div>
        </Group>

        <Group title="Help">
          <div className="dlist">
            <NavRow icon="sun" title="Show the guide again" onClick={startGuide} />
          </div>
        </Group>

        <Group title="Font" sub="Headlines and numbers">
          <div className="fontlist" role="group" aria-label="Font">
            {FONT_THEMES.map((f) => {
              const on = f.value === fontTheme;
              return (
                <button type="button" key={f.value} className="fontopt" aria-pressed={on} onClick={() => setFontTheme(f.value)}>
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
                    {on && <Icon name="check" size={14} color="#172022" strokeWidth={2.4} />}
                  </span>
                </button>
              );
            })}
          </div>
        </Group>

        <Group title="Notifications">
          <div className="dlist">
            <SwitchRow icon="bell" title="Call sheet is out" hint="When tomorrow's call sheet is out" on={callSheetOut} onToggle={() => toggle('callSheetOut')} />
            <SwitchRow icon="logTime" title="Reminder to submit hours" hint="When days are still open at week's end" on={hoursReminder} onToggle={() => toggle('hoursReminder')} />
          </div>
        </Group>

        <Group title="App">
          <div className="dlist">
            <NavRow icon="globe" title="Language" value="English" onClick={() => toast('More languages are not part of this demo')} />
            <NavRow icon="shield" title="Privacy" onClick={() => toast('The privacy policy is not part of this demo')} />
            <NavRow icon="file" title="Imprint" onClick={() => toast('The imprint is not part of this demo')} />
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
