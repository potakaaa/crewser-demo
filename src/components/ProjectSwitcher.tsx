import { useDemo } from '../store';
import { today, type CrewLink } from '../mock';
import { Icon } from './Icon';
import { diffDays, fmtDayMonth } from '../lib/dates';

/** Project groups, the one in use first. Inside a group you come first, then your colleagues. */
function groupLinks(links: CrewLink[], activeId: string) {
  const ids = [...new Set(links.map((l) => l.projectId))];
  const activeProject = links.find((l) => l.id === activeId)?.projectId;
  ids.sort((a, b) => Number(b === activeProject) - Number(a === activeProject));
  return ids.map((projectId) => {
    const members = links.filter((l) => l.projectId === projectId).sort((a, b) => Number(b.isMe) - Number(a.isMe));
    return { projectId, name: members[0].projectName, production: members[0].production, members };
  });
}

/** Chip text and the line under the name for one link. */
function validity(l: CrewLink) {
  const end = l.expiresAt.slice(0, 10);
  const n = diffDays(end, today.date);
  if (l.status === 'revoked') return { chip: 'Access removed', sub: `Removed ${fmtDayMonth(l.revokedAt!.slice(0, 10))}` };
  if (l.status === 'expired') return { chip: 'Expired', sub: `Ended ${fmtDayMonth(end)}` };
  if (l.status === 'expiring') return { chip: n <= 0 ? 'Expires today' : n === 1 ? 'Expires tomorrow' : `Expires in ${n} days`, sub: `Ends ${fmtDayMonth(end)}` };
  return { chip: null, sub: `Valid until ${fmtDayMonth(end)}` };
}

function LinkRow({ link, active, onPick }: { link: CrewLink; active: boolean; onPick: (l: CrewLink) => void }) {
  const blocked = link.status === 'expired' || link.status === 'revoked';
  const v = validity(link);
  return (
    <button
      type="button"
      className={`lrow${active ? ' is-active' : ''}${blocked ? ' is-blocked' : ''}`}
      aria-pressed={active}
      aria-disabled={blocked}
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
        <span className="lrow-sub">
          {link.position} · {v.sub}
        </span>
        {blocked && <span className="lrow-ask">{link.isMe ? 'Ask production for a new link' : 'Ask them or production for a new link'}</span>}
      </span>
      {active ? (
        <span className="lchip lchip-active">
          <Icon name="check" size={13} color="currentColor" strokeWidth={2.4} />
          Active
        </span>
      ) : v.chip ? (
        <span className={`lchip ${blocked ? 'lchip-blocked' : 'lchip-warn'}`}>{v.chip}</span>
      ) : (
        <span className="lradio" aria-hidden="true" />
      )}
    </button>
  );
}

/** Body of the 'project' sheet: every crew link on this phone, grouped by project and person. */
export function ProjectSwitcher() {
  const links = useDemo((s) => s.links);
  const activeId = useDemo((s) => s.activeLinkId);
  const setActiveLink = useDemo((s) => s.setActiveLink);
  const closeSheet = useDemo((s) => s.closeSheet);
  const toast = useDemo((s) => s.showToast);

  const pick = (l: CrewLink) => {
    if (l.id === activeId) return closeSheet();
    if (!setActiveLink(l.id)) return; // expired or revoked: the store explains why and the sheet stays open
    toast(l.isMe ? `Switched to ${l.projectName}` : `Switched to ${l.personName} · ${l.projectName}`);
  };

  return (
    <div className="switcher">
      <p className="lintro">One crew link is one person on one project. As head of department you can also hold links for your team and enter their hours.</p>
      {groupLinks(links, activeId).map((g) => (
        <section className="lgroup" key={g.projectId} aria-label={g.name}>
          <div className="lgroup-h">
            <strong>{g.name}</strong>
            <span>{g.production}</span>
          </div>
          <div className="dlist">
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
