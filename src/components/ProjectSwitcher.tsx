import { useDemo } from '../store';
import { links, today, type CrewLink } from '../mock';
import { Icon } from './Icon';
import { diffDays, fmtDayMonth } from '../lib/dates';

/** Project groups, the one in use first. Inside a group you come first, then your colleagues. */
function groupLinks(activeId: string) {
  const ids = [...new Set(links.map((l) => l.projectId))];
  const activeProject = links.find((l) => l.id === activeId)?.projectId;
  ids.sort((a, b) => Number(b === activeProject) - Number(a === activeProject));
  return ids.map((projectId) => {
    const members = links.filter((l) => l.projectId === projectId).sort((a, b) => Number(b.isMe) - Number(a.isMe));
    return { projectId, name: members[0].projectName, production: members[0].production, members };
  });
}

/** "Expires in 3 days" · "Expires tomorrow" · "Valid until 30 Nov" */
function validity(l: CrewLink) {
  const n = diffDays(l.expiresAt.slice(0, 10), today.date);
  if (l.status === 'expired') return { chip: 'Expired', sub: `Ended ${fmtDayMonth(l.expiresAt.slice(0, 10))}` };
  if (l.status === 'expiring') return { chip: n <= 0 ? 'Expires today' : n === 1 ? 'Expires tomorrow' : `Expires in ${n} days`, sub: `Ends ${fmtDayMonth(l.expiresAt.slice(0, 10))}` };
  return { chip: null, sub: `Valid until ${fmtDayMonth(l.expiresAt.slice(0, 10))}` };
}

function LinkRow({ link, active, onPick }: { link: CrewLink; active: boolean; onPick: (l: CrewLink) => void }) {
  const expired = link.status === 'expired';
  const v = validity(link);
  return (
    <button
      type="button"
      className={`lrow${active ? ' is-active' : ''}${expired ? ' is-expired' : ''}`}
      role="radio"
      aria-checked={active}
      aria-disabled={expired}
      onClick={() => onPick(link)}
    >
      <span className="lrow-av" aria-hidden="true">
        {link.initials}
      </span>
      <span className="lrow-text">
        <span className="lrow-name">
          {link.isMe ? 'You' : link.personName}
          {!link.isMe && <span className="lrow-role"> · {link.department}</span>}
        </span>
        <span className="lrow-sub">{link.isMe ? `${link.position} · ${v.sub}` : `${link.position} · hours entered by you`}</span>
        {expired && <span className="lrow-ask">Ask production for a new link</span>}
      </span>
      {active ? (
        <span className="lchip lchip-active">
          <Icon name="check" size={13} color="#111A1B" strokeWidth={2.4} />
          Active
        </span>
      ) : v.chip ? (
        <span className={`lchip ${expired ? 'lchip-expired' : 'lchip-warn'}`}>{v.chip}</span>
      ) : (
        <span className="lradio" aria-hidden="true" />
      )}
    </button>
  );
}

/** Body of the 'project' sheet: every crew link on this phone, grouped by project and person. */
export function ProjectSwitcher() {
  const activeId = useDemo((s) => s.activeLinkId);
  const setActiveLink = useDemo((s) => s.setActiveLink);
  const closeSheet = useDemo((s) => s.closeSheet);
  const toast = useDemo((s) => s.showToast);

  const pick = (l: CrewLink) => {
    if (l.status === 'expired') return setActiveLink(l.id); // the store explains why it can't switch
    if (l.id === activeId) return closeSheet();
    setActiveLink(l.id);
    closeSheet();
    toast(l.isMe ? `Switched to ${l.projectName}` : `Switched to ${l.personName} · ${l.projectName}`);
  };

  return (
    <div className="switcher">
      <p className="lintro">One crew link is one person on one project. As gaffer you can also hold links for your team and enter their hours.</p>
      {groupLinks(activeId).map((g) => (
        <section className="lgroup" key={g.projectId} aria-label={g.name}>
          <div className="lgroup-h">
            <strong>{g.name}</strong>
            <span>{g.production}</span>
          </div>
          <div className="dlist" role="radiogroup" aria-label={`${g.name} crew links`}>
            {g.members.map((l) => (
              <LinkRow key={l.id} link={l} active={l.id === activeId} onPick={pick} />
            ))}
          </div>
        </section>
      ))}
      <button type="button" className="btn btn-ink btn-md btn-add" onClick={() => toast('Pasting a link or scanning a QR code is not part of this demo')}>
        <Icon name="plus" size={18} color="#FFFFFF" />
        Add crew link
      </button>
      <p className="lfoot">Paste the link from your SMS or scan the QR code from production.</p>
    </div>
  );
}
