import { Icon } from './Icon';
import { useAddActions } from '../lib/addActions';

/** Home's one-tap row: track time by hand, scan an invoice. */
export function QuickActions() {
  const actions = useAddActions();
  return (
    <div className="quick" role="group" aria-label="Add">
      {actions.map((a) => (
        <button type="button" key={a.id} className="quick-tile" onClick={a.run}>
          <span className="quick-icon">
            <Icon name={a.icon} size={20} color="currentColor" strokeWidth={1.8} />
          </span>
          <span className="quick-t">{a.label}</span>
        </button>
      ))}
    </div>
  );
}
