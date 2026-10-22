import { useState } from 'react';
import { useDemo } from '../store';
import { docs, project, today, type Doc } from '../mock';
import { Icon } from '../components/Icon';
import { Collapse, GradientHeader, ScreenTitle, SectionHead, Sheet } from '../components/Layout';
import { callSheets, dayWord, groupOf, GROUP_TITLE, updatedLabel, type DocGroup } from '../components/docs/docs';
import { fmtDayMonth } from '../lib/dates';
import { useScrollRestore } from '../lib/scroll';

type Filter = 'all' | DocGroup;

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
  const isSheet = doc.kind === 'callsheet' && doc.day;
  const title = isSheet ? `Shoot day ${doc.shootDay}` : doc.title;
  const meta = isSheet ? `${fmtDayMonth(doc.day!)} · ${doc.size}` : `Updated ${updatedLabel(doc.updated)} · ${doc.size}`;
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
          {isSheet && doc.day === today.date && <span className="drow-today">Today</span>}
        </span>
        <span className="drow-meta">{meta}</span>
      </span>
      <Icon name="right" size={18} color="#54686C" />
    </button>
  );
}

function PinnedCallSheet({ doc }: { doc: Doc }) {
  const navigate = useDemo((s) => s.navigate);
  return (
    <button type="button" className="dpin" onClick={() => navigate({ name: 'pdf', file: doc.file })}>
      <span className="dpin-top">
        <span className="dpin-kicker">
          <Icon name="pin" size={15} color="#C4CFD0" />
          {dayWord(doc.day!)} · Shoot day {doc.shootDay}
        </span>
        {doc.isNew && <span className="chip-lime chip-lime-sm">new</span>}
      </span>
      <span className="dpin-title">{fmtDayMonth(doc.day!)} · call sheet</span>
      <span className="dpin-meta">
        {project.name} · updated {updatedLabel(doc.updated)} · {doc.size}
      </span>
      <span className="dpin-cta">
        Open call sheet
        <Icon name="arrowRight" size={18} color="#111A1B" />
      </span>
    </button>
  );
}

function CallSheetSection({ filtered }: { filtered: Doc[] }) {
  const [older, setOlder] = useState(false);
  const recent = filtered.slice(0, RECENT);
  const rest = filtered.slice(RECENT);
  return (
    <section className="stack" aria-label={GROUP_TITLE.callsheet}>
      <SectionHead title={GROUP_TITLE.callsheet} sub="By day, newest first" />
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

  const latest = callSheets[0];
  const rest = callSheets.slice(1);
  const show = (g: DocGroup) => filter === 'all' || filter === g;
  const groupDocs = (g: DocGroup) => docs.filter((d) => groupOf(d) === g);
  const sections: { group: Exclude<DocGroup, 'callsheet'>; sub: string }[] = [
    { group: 'schedule', sub: 'Shoot plan and script overview' },
    { group: 'safety', sub: 'Know where you are and what to watch' },
    { group: 'other', sub: 'Everything else production shared' },
  ];

  return (
    <div className="screen" ref={ref}>
      <div className="sat-band" aria-hidden="true" />
      <GradientHeader className="gh-compact">
        <ScreenTitle eyebrow={`${project.name} · ${docs.length} files`} title="Documents" />
        <div className="fchips" role="group" aria-label="Filter documents">
          {FILTERS.map((f) => (
            <button type="button" key={f.value} className="fchip" aria-pressed={filter === f.value} onClick={() => setFilter(f.value)}>
              {f.label}
            </button>
          ))}
        </div>
      </GradientHeader>

      <Sheet>
        {latest && show('callsheet') && <PinnedCallSheet doc={latest} />}
        {show('callsheet') && rest.length > 0 && <CallSheetSection filtered={rest} />}
        {sections
          .filter((s) => show(s.group) && groupDocs(s.group).length > 0)
          .map((s) => (
            <section className="stack" key={s.group} aria-label={GROUP_TITLE[s.group]}>
              <SectionHead title={GROUP_TITLE[s.group]} sub={s.sub} />
              <div className="dlist">
                {groupDocs(s.group).map((d) => (
                  <DocRow key={d.id} doc={d} />
                ))}
              </div>
            </section>
          ))}
        {filter !== 'all' && filter !== 'callsheet' && groupDocs(filter).length === 0 && <p className="sheet-empty">Nothing here yet.</p>}
      </Sheet>
    </div>
  );
}
