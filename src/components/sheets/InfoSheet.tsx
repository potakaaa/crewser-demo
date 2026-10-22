import { notes, person } from '../../mock';
import { useDemo } from '../../store';
import { Icon } from '../Icon';
import { chipStyle } from '../../lib/noteStyle';
import { TYPE_LABEL } from '../../lib/notes';

/** What production needs once, before the first payout. */
const MASTER_DATA = ['Personal details', 'Address', 'Tax and social security number', 'Bank account (IBAN)'];

/** Sheet title and subtitle, used by SheetHost. */
export function infoSheetMeta(id?: string) {
  return id === 'master' ? { title: 'Master data', subtitle: `${person.displayName} · ${person.position}` } : { title: 'General info', subtitle: 'Notes without a date' };
}

function MasterData() {
  const done = useDemo((s) => s.masterDataDone);
  const complete = useDemo((s) => s.completeMasterData);
  const close = useDemo((s) => s.closeSheet);
  const toast = useDemo((s) => s.showToast);
  const finish = () => {
    complete();
    close();
    toast('Master data sent to production. Thank you!');
  };
  return (
    <>
      <p className="note-text">Production needs these once, before your first payout. It takes about two minutes and you can do it on set.</p>
      <ul className="info-checks">
        {MASTER_DATA.map((label) => (
          <li key={label}>
            <span className="info-check" data-done={done}>
              {done && <Icon name="check" size={14} color="#2B3300" strokeWidth={2.2} />}
            </span>
            {label}
          </li>
        ))}
      </ul>
      {done ? (
        <p className="sheet-empty">Master data is complete.</p>
      ) : (
        <button type="button" className="btn btn-lime btn-lg" onClick={finish}>
          Fill in and send (demo)
        </button>
      )}
    </>
  );
}

/** Notes without a date, or the master data form when `id` is "master". */
export function InfoSheet({ id }: { id?: string }) {
  const openSheet = useDemo((s) => s.openSheet);
  const empty = useDemo((s) => s.empty);
  if (id === 'master') return <MasterData />;
  const undated = empty ? [] : notes.filter((n) => !n.day);
  if (!undated.length) return <p className="sheet-empty">No general info yet. Notes without a date from production land here.</p>;
  return (
    <ul className="info-list">
      {undated.map((n) => (
        <li key={n.id}>
          <button type="button" className="info-item" onClick={() => openSheet('note', n.id)}>
            <span className="chip-icon" style={chipStyle(n.type)}>
              <Icon name={n.type} size={18} />
            </span>
            <span className="row-titles">
              <span className="row-t1">{n.title}</span>
              <span className="row-t2">
                {TYPE_LABEL[n.type]} · {n.subtitle}
              </span>
            </span>
            <Icon name="right" size={18} color="#54686C" />
          </button>
        </li>
      ))}
    </ul>
  );
}
