import { notes, person } from '../../mock';
import { useDemo } from '../../store';
import { Icon } from '../Icon';
import { chipStyle } from '../../lib/noteStyle';
import { TYPE_LABEL, undatedNotes } from '../../lib/notes';

/** The sheet closes in 300 ms (BottomSheet); a little longer, so its own focus hand-back has run first. */
const FOCUS_AFTER_CLOSE_MS = 450;
// Not cleared on unmount: this component is gone by the time the timer fires, and that is the point.
let focusTimer = 0;

/** What production needs once, before the first payout. */
const MASTER_DATA = ['Personal details', 'Address', 'Tax and social security number', 'Bank account (IBAN)'];

/** Sheet title and subtitle, used by SheetHost. */
export function infoSheetMeta(id?: string) {
  return id === 'master' ? { title: 'Master data', subtitle: `${person.displayName} · ${person.position}` } : { title: 'General info', subtitle: 'Important info for the whole project' };
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
    // The card that opened this sheet is gone now, so the sheet cannot hand focus back to it:
    // put it on the hours strip, which takes its place. Waits out the sheet's closing animation.
    window.clearTimeout(focusTimer);
    focusTimer = window.setTimeout(() => {
      if (document.activeElement === document.body || !document.activeElement) document.querySelector<HTMLElement>('[data-after-master]')?.focus();
    }, FOCUS_AFTER_CLOSE_MS);
  };
  return (
    <>
      <p className="note-text">Production needs these once, before your first payout. It takes about two minutes and you can do it on set.</p>
      <ul className="info-checks">
        {MASTER_DATA.map((label) => (
          <li key={label}>
            <span className="info-check" data-done={done} aria-hidden="true">
              {done && <Icon name="check" size={14} color="#172022" strokeWidth={2.2} />}
            </span>
            {label}
            <span className="sr-only">{done ? ', done' : ', not done yet'}</span>
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

/** General info (notes with no date), or the master data form when `id` is "master". */
export function InfoSheet({ id }: { id?: string }) {
  const openSheet = useDemo((s) => s.openSheet);
  const empty = useDemo((s) => s.empty);
  if (id === 'master') return <MasterData />;
  const undated = undatedNotes(empty ? [] : notes);
  if (!undated.length) return <p className="sheet-empty">No general info yet. Important project info from production lands here.</p>;
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
            <Icon name="right" size={18} color="#9AAAAC" />
          </button>
        </li>
      ))}
    </ul>
  );
}
