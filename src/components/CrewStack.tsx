import { useId, useState } from 'react';
import { person } from '../mock';
import type { CrewMember, Note } from '../mock';
import { Icon } from './Icon';
import { Collapse } from './Layout';
import { byDepartment, crewLabel, noteCrew } from '../lib/crew';

const SHOWN = 3;

export function Avatar({ member, size = 'sm' }: { member: CrewMember; size?: 'sm' | 'md' }) {
  return (
    <span className={`avatar-chip avatar-${size}`} style={{ background: member.tint }} aria-hidden="true">
      {member.initials}
    </span>
  );
}

/** Three overlapping avatars and a "+N" bubble for the rest. */
export function AvatarStack({ members }: { members: CrewMember[] }) {
  const rest = members.length - SHOWN;
  return (
    <span className="avatar-stack" aria-hidden="true">
      {members.slice(0, SHOWN).map((m) => (
        <Avatar key={m.id} member={m} />
      ))}
      {rest > 0 && <span className="avatar-chip avatar-sm avatar-more">+{rest}</span>}
    </span>
  );
}

/** Everyone on the note, grouped by department. */
export function CrewList({ members }: { members: CrewMember[] }) {
  return (
    <div className="crew-list">
      {byDepartment(members).map((g) => (
        <div className="crew-group" key={g.department}>
          <span className="crew-dept">
            {g.department} · {g.members.length}
          </span>
          <ul>
            {g.members.map((m) => (
              <li key={m.id} className="crew-person">
                <Avatar member={m} size="md" />
                <span className="crew-person-text">
                  <strong>{m.name}</strong>
                  <span>{m.position}</span>
                </span>
                {m.id === person.id && <span className="you-chip">You</span>}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

/** Avatar stack with the count; tapping it opens the full list of who is involved. */
export function CrewSection({ note }: { note: Note }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const members = noteCrew(note);
  const label = crewLabel(note);
  return (
    <div className="crew">
      <button type="button" className="crew-toggle" aria-expanded={open} aria-controls={id} onClick={() => setOpen((v) => !v)}>
        <AvatarStack members={members} />
        <span className="crew-label">{label}</span>
        <span className="crew-action">
          {open ? 'Hide' : 'Show all'}
          <span className="chev" data-open={open}>
            <Icon name="down" size={14} strokeWidth={1.8} />
          </span>
        </span>
      </button>
      <Collapse open={open} id={id}>
        <CrewList members={members} />
      </Collapse>
    </div>
  );
}
