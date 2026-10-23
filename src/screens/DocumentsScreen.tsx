import { useState } from 'react';
import { useActiveLink, useDemo } from '../store';
import { docs, today, type Doc, type DocKind } from '../mock';
import { ForChip } from '../components/ForChip';
import { NotifButton } from '../components/NotifButton';
import { Icon } from '../components/Icon';
import { Collapse, GradientHeader, ScreenTitle, SectionHead, Sheet } from '../components/Layout';
import { callSheets, dayWord, KIND_TITLE, updatedLabel, type CallSheet } from '../components/docs/docs';
import { fmtDayMonth } from '../lib/dates';
import { useScrollRestore } from '../lib/scroll';

type Filter = 'all' | DocKind;

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'callsheet', label: 'Call sheets' },
  { value: 'schedule', label: 'Schedules' },
  { value: 'safety', label: 'Location & safety' },
  { value: 'other', label: 'Other' },
];

/** Call sheets shown before the rest fold into "Earlier days". */
const RECENT = 3;

function DocRow({ doc }: { doc: Doc }) {
  const navigate = useDemo((s) => s.navigate);
  const day = doc.kind === 'callsheet' ? doc.day : undefined;
  const title = day && doc.shootDay ? `Shoot day ${doc.shootDay}` : doc.title;
  const meta = day ? `${fmtDayMonth(day)} · ${doc.size}` : `Updated ${updatedLabel(doc.updated)} · ${doc.size}`;
  return (
    <button type="button" className="drow" onClick={() => navigate({ name: 'pdf', file: doc.file })}>
      <span className="chip-icon">
        <Icon name="file" size={20} color="#2A3B3F" />
      </span>
      <span className="drow-main">
        <span className="drow-title">
          {title}
          {doc.isNew && (
            <>
              <i className="new-dot" aria-hidden="true" />
              <span className="sr-only">new</span>
            </>
          )}
          {day === today.date && <span className="drow-today">Today</span>}
        </span>
        <span className="drow-meta">{meta}</span>
      </span>
      <Icon name="right" size={18} color="#54686C" />
    </button>
  );
}

function PinnedCallSheet({ doc }: { doc: CallSheet }) {
  const navigate = useDemo((s) => s.navigate);
  const projectName = useActiveLink().projectName;
  return (
    <button type="button" className="dpin" onClick={() => navigate({ name: 'pdf', file: doc.file })}>
      <span className="dpin-top">
        <span className="dpin-kicker">
          <Icon name="pin" size={15} color="#C4CFD0" />
          {dayWord(doc.day)}{doc.shootDay ? ` · Shoot day ${doc.shootDay}` : ''}
        </span>
        {doc.isNew && <span className="chip-lime chip-lime-sm">new</span>}
      </span>
      <span className="dpin-title">{fmtDayMonth(doc.day)} · call sheet</span>
      <span className="dpin-meta">
        {projectName} · updated {updatedLabel(doc.updated)} · {doc.size}
      </span>
      <span className="dpin-cta">
        Open call sheet
        <Icon name="arrowRight" size={18} color="#111A1B" />
      </span>
    </button>
  );
}

function CallSheetSection({ filtered }: { filtered: CallSheet[] }) {
  const [older, setOlder] = useState(false);
  const recent = filtered.slice(0, RECENT);
  const rest = filtered.slice(RECENT);
  return (
    <section className="stack" aria-label={KIND_TITLE.callsheet}>
      <SectionHead title={KIND_TITLE.callsheet} />
      <div className="dlist">
        {recent.map((d) => (
          <DocRow key={d.id} doc={d} />
        ))}
        {rest.length > 0 && (
          <>
            <Collapse open={older} id="older-callsheets">
              <div className="dlist-inner">
                {rest.map((d) => (
                  <DocRow key={d.id} doc={d} />
                ))}
              </div>
            </Collapse>
            <button type="button" className="dmore" aria-expanded={older} aria-controls="older-callsheets" onClick={() => setOlder((v) => !v)}>
              {older ? 'Hide earlier days' : `Earlier days (${rest.length})`}
              <span className="chev" data-open={older}>
                <Icon name="down" size={16} color="#2C6B72" strokeWidth={1.8} />
              </span>
            </button>
          </>
        )}
      </div>
    </section>
  );
}

export function DocumentsScreen() {
  const ref = useScrollRestore<HTMLDivElement>('documents', useDemo((s) => s.setStatusDark));
  const [filter, setFilter] = useState<Filter>('all');
  const projectName = useActiveLink().projectName;

  const latest = callSheets[0];
  const rest = callSheets.slice(1);
  const show = (k: DocKind) => filter === 'all' || filter === k;
  const kindDocs = (k: DocKind) => docs.filter((d) => d.kind === k);
  const sections: Exclude<DocKind, 'callsheet'>[] = ['schedule', 'safety', 'other'];

  return (
    <div className="screen" ref={ref}>
      <div className="sat-band" aria-hidden="true" />
      <GradientHeader className="gh-compact">
        <ScreenTitle eyebrow={`${projectName} · ${docs.length} files`} title="Documents">
          <ForChip compact />
          <NotifButton tone="dark" />
        </ScreenTitle>
        <div className="fchips" role="group" aria-label="Filter documents">
          {FILTERS.map((f) => (
            <button type="button" key={f.value} className="fchip" aria-pressed={filter === f.value} onClick={() => setFilter(f.value)}>
              {f.label}
            </button>
          ))}
        </div>
      </GradientHeader>

      <Sheet className="sheet-compact">
        {latest && show('callsheet') && <PinnedCallSheet doc={latest} />}
        {show('callsheet') && rest.length > 0 && <CallSheetSection filtered={rest} />}
        {sections
          .filter((k) => show(k) && kindDocs(k).length > 0)
          .map((k) => (
            <section className="stack" key={k} aria-label={KIND_TITLE[k]}>
              <SectionHead title={KIND_TITLE[k]} />
              <div className="dlist">
                {kindDocs(k).map((d) => (
                  <DocRow key={d.id} doc={d} />
                ))}
              </div>
            </section>
          ))}
        {filter !== 'all' && kindDocs(filter).length === 0 && <p className="sheet-empty">Nothing here yet.</p>}
      </Sheet>
    </div>
  );
}
