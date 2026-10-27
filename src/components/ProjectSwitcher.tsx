import { useDemo } from '../store';
import { today, type CrewLink } from '../mock';
import { Icon } from './Icon';
import { diffDays } from '../lib/dates';

/** Project groups, the one in use first. Inside a group you come first, then your colleagues. */
function groupLinks(links: CrewLink[], activeId: string) {
  const ids = [...new Set(links.map((l) => l.projectId))];
  const activeProject = links.find((l) => l.id === activeId)?.projectId;
  ids.sort((a, b) => Number(b === activeProject) - Number(a === activeProject));
  return ids.map((projectId) => {
    const members = links.filter((l) => l.projectId === projectId).sort((a, b) => Number(b.isMe) - Number(a.isMe));
    return { projectId, name: members[0].projectName, members };
  });
}

/** A chip only when the link needs attention; a valid link says nothing about its dates. */
function validityChip(l: CrewLink): string | null {
  const n = diffDays(l.expiresAt.slice(0, 10), today.date);
  if (l.status === 'revoked') return 'Access removed';
  if (l.status === 'expired') return 'Expired';
  if (l.status === 'expiring') return n <= 0 ? 'Expires today' : n === 1 ? 'Expires tomorrow' : `Expires in ${n} days`;
  return null;
}

function LinkRow({ link, active, onPick }: { link: CrewLink; active: boolean; onPick: (l: CrewLink) => void }) {
  const blocked = link.status === 'expired' || link.status === 'revoked';
  const chip = validityChip(link);
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
        <span className="lrow-name">{link.isMe ? 'You' : link.personName}</span>
        <span className="lrow-sub">{link.position}</span>
      </span>
      {active ? (
        <span className="lchip lchip-active">
          <Icon name="check" size={13} color="currentColor" strokeWidth={2.4} />
          Active
        </span>
      ) : (
        chip && <span className={`lchip ${blocked ? 'lchip-blocked' : 'lchip-warn'}`}>{chip}</span>
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
      {groupLinks(links, activeId).map((g) => (
        <section className="lgroup" key={g.projectId} aria-label={g.name}>
          <div className="lgroup-h">
            <strong>{g.name}</strong>
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
    </div>
  );
}
