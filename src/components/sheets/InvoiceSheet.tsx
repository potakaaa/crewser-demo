import { useEffect, useState } from 'react';
import { INVOICE_CATEGORIES, scannedInvoice as inv } from '../../mock';
import { useActiveLink, useDemo } from '../../store';
import { Icon } from '../Icon';
import { fmtDayMonth } from '../../lib/dates';

/** How long "reading" takes; long enough to see the scan line pass. */
const READ_MS = 1100;

const eur = (v: number) => `€${v.toFixed(2)}`;

export const invoiceSheetMeta = () => ({ title: 'Scan invoice', subtitle: 'Receipts for things you paid for the shoot' });

/** Camera viewfinder (a drawn receipt: the demo has no camera), then what was read off it, ready to add. */
export function InvoiceSheet() {
  const [stage, setStage] = useState<'aim' | 'reading' | 'done'>('aim');
  const [category, setCategory] = useState<string>(INVOICE_CATEGORIES[0]);
  const close = useDemo((s) => s.closeSheet);
  const toast = useDemo((s) => s.showToast);
  const link = useActiveLink();

  useEffect(() => {
    if (stage !== 'reading') return;
    const t = window.setTimeout(() => setStage('done'), READ_MS);
    return () => window.clearTimeout(t);
  }, [stage]);

  const add = () => {
    close();
    toast(`Invoice added: ${eur(inv.total)} ${category.toLowerCase()} for ${link.projectName}`);
  };

  return (
    <div className="inv">
      <div className="inv-finder" data-stage={stage} aria-hidden="true">
        <div className="inv-paper">
          <span className="inv-paper-h">{inv.vendor}</span>
          <span className="inv-paper-s">{inv.address}</span>
          {inv.lines.map((l) => (
            <span className="inv-paper-row" key={l.label}>
              <span>{l.label}</span>
              <span>{l.amount.toFixed(2)}</span>
            </span>
          ))}
          <span className="inv-paper-row inv-paper-total">
            <span>TOTAL EUR</span>
            <span>{inv.total.toFixed(2)}</span>
          </span>
        </div>
        <span className="inv-corners" />
        {stage === 'reading' && <span className="inv-scanline" />}
        {stage === 'done' && (
          <span className="inv-found">
            <Icon name="check" size={16} color="currentColor" strokeWidth={2.4} />
            Receipt read
          </span>
        )}
      </div>

      <p className="sr-only" role="status">
        {stage === 'reading' ? 'Reading the receipt…' : stage === 'done' ? `Read: ${inv.vendor}, ${eur(inv.total)}.` : ''}
      </p>

      {stage !== 'done' ? (
        <>
          <p className="inv-hint">{stage === 'aim' ? 'Lay the receipt flat and fit it inside the corners.' : 'Reading the receipt…'}</p>
          <button type="button" className="inv-shutter" onClick={() => setStage('reading')} disabled={stage === 'reading'} aria-label="Capture receipt">
            <span />
          </button>
          <button type="button" className="link-btn inv-upload" onClick={() => setStage('reading')} disabled={stage === 'reading'}>
            Choose a photo or PDF instead
          </button>
        </>
      ) : (
        <>
          <div className="inv-result">
            <div className="inv-total">
              <span className="inv-total-v num">{eur(inv.total)}</span>
              <span className="inv-total-s">incl. {eur(inv.vat)} VAT</span>
            </div>
            <dl className="inv-fields">
              <div>
                <dt>From</dt>
                <dd>{inv.vendor}</dd>
              </div>
              <div>
                <dt>Date</dt>
                <dd>{fmtDayMonth(inv.date)}</dd>
              </div>
              <div>
                <dt>Invoice no.</dt>
                <dd>{inv.number}</dd>
              </div>
              <div>
                <dt>Project</dt>
                <dd>{link.projectName}</dd>
              </div>
            </dl>
          </div>
          <fieldset className="inv-cats">
            <legend>Category</legend>
            {INVOICE_CATEGORIES.map((c) => (
              <label key={c} className="inv-cat" data-on={c === category}>
                <input type="radio" name="inv-cat" value={c} checked={c === category} onChange={() => setCategory(c)} />
                {c}
              </label>
            ))}
          </fieldset>
          <div className="inv-actions">
            <button type="button" className="btn btn-outline btn-md" onClick={() => setStage('aim')}>
              Retake
            </button>
            <button type="button" className="btn btn-lime btn-md" onClick={add}>
              Add invoice
            </button>
          </div>
        </>
      )}
    </div>
  );
}
