import { contacts, person, project } from '../../mock';
import { Icon } from '../Icon';
import { Avatar } from '../contacts/Avatar';
import { useContactActions } from '../contacts/useContactActions';

/** One person from the staff list: who they are, and every way to reach them. */
export function ContactSheet({ id }: { id?: string }) {
  const act = useContactActions();
  const c = contacts.find((x) => x.id === id);
  if (!c) return <p className="sheet-empty">This contact is no longer on the staff list.</p>;

  return (
    <div className="csheet">
      <div className="csheet-who">
        <Avatar initials={c.initials} tint={c.tint} size={56} />
        <span className="crow-text">
          <span className="csheet-dept">
            {c.department}
            {c.id === person.id && <span className="crow-you">You</span>}
          </span>
          <span className="csheet-proj">{project.name}</span>
        </span>
      </div>

      <div className="cacts">
        <button type="button" className="cact cact-main" onClick={() => act.call(c)}>
          <Icon name="call" size={22} color="#FFFFFF" />
          Call
        </button>
        <button type="button" className="cact" onClick={() => act.message(c)}>
          <Icon name="message" size={22} color="#111A1B" />
          Message
        </button>
        <button type="button" className="cact" onClick={() => act.mail(c)}>
          <Icon name="mail" size={22} color="#111A1B" />
          Email
        </button>
      </div>

      <div className="cdetails">
        <div className="cdetail">
          <span className="cdetail-k">Mobile</span>
          <span className="cdetail-v">{c.phone}</span>
          <button type="button" className="cdetail-copy" aria-label={`Copy number ${c.phone}`} onClick={() => act.copy(c.phone, 'Number')}>
            <Icon name="copy" size={18} color="#2C6B72" />
          </button>
        </div>
        <div className="cdetail">
          <span className="cdetail-k">Email</span>
          <span className="cdetail-v">{c.email}</span>
          <button type="button" className="cdetail-copy" aria-label={`Copy email ${c.email}`} onClick={() => act.copy(c.email, 'Email address')}>
            <Icon name="copy" size={18} color="#2C6B72" />
          </button>
        </div>
      </div>
      <p className="sheet-note">Shared by production on the staff list. Only your project crew can see this.</p>
    </div>
  );
}
