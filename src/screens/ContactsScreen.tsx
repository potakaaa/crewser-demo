import { useMemo, useRef, useState } from 'react';
import { useActiveLink, useDemo } from '../store';
import { CONTACT_DEPARTMENTS, contacts, person, type Contact } from '../mock';
import { ForChip } from '../components/ForChip';
import { TimerChip } from '../components/TimerChip';
import { Icon } from '../components/Icon';
import { GradientHeader, ScreenTitle, Sheet } from '../components/Layout';
import { Avatar } from '../components/contacts/Avatar';
import { useContactActions } from '../components/contacts/useContactActions';
import { matchesContact } from '../components/contacts/search';
import { useScrollRestore } from '../lib/scroll';

/** Round quick action next to a row; sits beside (not inside) the row button. */
function QuickButtons({ c, onDark = false }: { c: Contact; onDark?: boolean }) {
  const act = useContactActions();
  const color = onDark ? '#FFFFFF' : 'currentColor';
  const cls = onDark ? 'cquick cquick-dark' : 'cquick';
  return (
    <span className="cquicks">
      <button type="button" className={cls} aria-label={`Call ${c.name}`} onClick={() => act.call(c)}>
        <Icon name="call" size={18} color={color} />
      </button>
      <button type="button" className={cls} aria-label={`Email ${c.name}`} onClick={() => act.mail(c)}>
        <Icon name="mail" size={18} color={color} />
      </button>
    </span>
  );
}

function ContactRow({ c }: { c: Contact }) {
  const openSheet = useDemo((s) => s.openSheet);
  return (
    <div className="crow">
      <button type="button" className="crow-main" onClick={() => openSheet('contact', c.id)}>
        <Avatar initials={c.initials} tint={c.tint} />
        <span className="crow-text">
          <span className="crow-name">
            {c.name}
            {c.id === person.id && <span className="crow-you">You</span>}
          </span>
          <span className="crow-pos">{c.position}</span>
        </span>
      </button>
      <QuickButtons c={c} />
    </div>
  );
}

function Office({ office, others }: { office: Contact; others: Contact[] }) {
  const act = useContactActions();
  const openSheet = useDemo((s) => s.openSheet);
  return (
    <section className="coffice" aria-label="Production office">
      <button type="button" className="coffice-head" onClick={() => openSheet('contact', office.id)}>
        <Avatar initials={office.initials} tint={office.tint} size={40} />
        <span className="crow-text">
          <span className="coffice-kicker">Pinned</span>
          <span className="coffice-name">{office.name}</span>
          <span className="coffice-sub">{office.position}</span>
        </span>
      </button>
      <div className="btn-row">
        <button type="button" className="btn btn-lime btn-sm" onClick={() => act.call(office)}>
          <Icon name="call" size={18} color="currentColor" />
          Call
        </button>
        <button type="button" className="btn btn-glass btn-sm" onClick={() => act.mail(office)}>
          <Icon name="mail" size={18} color="#FFFFFF" />
          Email
        </button>
      </div>
      {others.map((c) => (
        <div className="coffice-row" key={c.id}>
          <button type="button" className="crow-main" onClick={() => openSheet('contact', c.id)}>
            <Avatar initials={c.initials} tint={c.tint} size={36} />
            <span className="crow-text">
              <span className="crow-name">{c.name}</span>
              <span className="coffice-sub">{c.position}</span>
            </span>
          </button>
          <QuickButtons c={c} onDark />
        </div>
      ))}
    </section>
  );
}

export function ContactsScreen() {
  const ref = useScrollRestore<HTMLDivElement>('contacts', useDemo((s) => s.setStatusDark));
  const [query, setQuery] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const projectName = useActiveLink().projectName;
  const q = query.trim();

  const office = contacts.find((c) => c.id === 'office');
  const pinned = contacts.filter((c) => c.pinned);
  const groups = useMemo(() => {
    // Pinned people sit in the office card until you search.
    const pool = contacts.filter((c) => (q ? matchesContact(c, q) : !c.pinned));
    return CONTACT_DEPARTMENTS.map((department) => ({ department, members: pool.filter((c) => c.department === department) })).filter(
      (g) => g.members.length > 0,
    );
  }, [q]);
  const total = groups.reduce((n, g) => n + g.members.length, 0);

  return (
    <div className="screen" ref={ref}>
      <div className="sat-band" aria-hidden="true" />
      <GradientHeader className="gh-compact">
        <ScreenTitle eyebrow={`${projectName} · ${contacts.length - 1} people`} title="Contacts">
          <ForChip compact />
          <TimerChip />
        </ScreenTitle>
        <div className="searchbox">
          <Icon name="search" size={18} color="#C4CFD0" />
          <input ref={input} type="search" aria-label="Search contacts" placeholder="Search name, role or number" value={query} onChange={(e) => setQuery(e.target.value)} />
          {query && (
            <button type="button" className="searchbox-clear" aria-label="Clear search" onClick={() => {
                setQuery('');
                input.current?.focus();
              }}>
              <Icon name="close" size={16} color="#FFFFFF" />
            </button>
          )}
        </div>
      </GradientHeader>

      <Sheet className="sheet-compact">
        {!q && office && <Office office={office} others={pinned.filter((c) => c.id !== office.id)} />}
        {groups.map((g) => (
          <section className="cdept" key={g.department} aria-label={g.department}>
            <h2 className="cdept-h">
              {g.department}
              <span>
                {g.members.length}
                <span className="sr-only"> people</span>
              </span>
            </h2>
            <div className="dlist">
              {g.members.map((c) => (
                <ContactRow key={c.id} c={c} />
              ))}
            </div>
          </section>
        ))}
        <p className="sr-only" role="status">
          {q ? `${total} ${total === 1 ? 'person' : 'people'} found` : ''}
        </p>
        {q && total === 0 && (
          <div className="empty-light">
            <strong>No one matches “{q}”</strong>
            <span>Try a first name, a position like “Gaffer” or a department.</span>
          </div>
        )}
      </Sheet>
    </div>
  );
}
