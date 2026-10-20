import { useDemo } from '../store';
import { notes, person, project, today, type Note } from '../mock';
import { Icon } from '../components/Icon';
import { Collapse, GradientHeader, OfflineBanner, SectionHead, Sheet } from '../components/Layout';
import { ContentCard, NoteRow } from '../components/NoteCards';
import { MiniWeekChart } from '../components/Charts';
import { Wordmark } from '../components/Brand';
import { useNoteActions } from '../lib/actions';
import { smartNotes, minutesUntil } from '../lib/notes';
import { fmtCountdown } from '../lib/dates';
import { fmtH, weekStats } from '../lib/stats';
import { useScrollRestore } from '../lib/scroll';

function NextUpCard({ note }: { note: Note }) {
  const a = useNoteActions();
  const wrap = note.facts.find((f) => f.label === 'Wrap' && !f.unconfirmed)?.value;
  const place = note.facts.find((f) => f.action === 'map')?.value ?? note.subtitle;
  return (
    <div className="nextup">
      <span className="nextup-layer l2" aria-hidden="true" />
      <span className="nextup-layer l1" aria-hidden="true" />
      <div className="nextup-card">
        <div className="nextup-top">
          <span className="chip-lime">UP NEXT</span>
          <span className="nextup-in">{fmtCountdown(minutesUntil(note))}</span>
          <span className="spacer" />
          <button type="button" className="icon-btn icon-btn-soft nextup-arrow" aria-label="Open details" onClick={() => a.openNote(note.id)}>
            <Icon name="arrowUpRight" size={18} color="#111A1B" strokeWidth={1.8} />
          </button>
        </div>
        <div className="nextup-main">
          <span className="nextup-time">{note.time}</span>
          <span className="nextup-titles">
            <span className="nextup-t1">{note.title}</span>
            <span className="nextup-t2">Call{wrap ? ` · wrap ${wrap}` : ''}</span>
          </span>
        </div>
        <span className="nextup-pin">
          <Icon name="pin" size={16} color="#3F5155" />
          {place}
        </span>
        <div className="btn-row">
          <button type="button" className="btn btn-soft" onClick={() => a.openNote(note.id)}>
            Details
          </button>
          <button type="button" className="btn btn-ink btn-grow" onClick={a.directions}>
            <Icon name="nav" size={16} color="#FFFFFF" strokeWidth={1.8} />
            Directions
          </button>
        </div>
      </div>
    </div>
  );
}

function WeekSection() {
  const navigate = useDemo((s) => s.navigate);
  const s = weekStats;
  const goStats = () => navigate({ name: 'stats' });
  return (
    <section className="stack" aria-label="Your week">
      <SectionHead title="Your week" sub={`Last 7 days · ${s.rangeLabel}`} link="All statistics" onLink={goStats} />
      <button type="button" className="week-card grain" onClick={goStats} aria-label={`${s.summary} ${fmtH(s.total)} h worked, ${fmtH(s.overTarget)} h over target. Open statistics.`}>
        <span className="week-top">
          <span className="kpi-dark">
            <span className="kpi-k">Hours worked</span>
            <span className="kpi-v">
              {fmtH(s.total)}
              <span className="kpi-unit"> h</span>
            </span>
          </span>
          <span className="spacer" />
          <span className="chip-lime chip-lime-sm">+{fmtH(s.overTarget)} h over target</span>
        </span>
        <MiniWeekChart stats={s} />
      </button>
      <div className="mini-tiles">
        <div className="mini-tile mini-tile-lime">
          <span>Overtime</span>
          <strong>+{fmtH(s.overtime)} h</strong>
        </div>
        <div className="mini-tile">
          <span>Daily avg</span>
          <strong>{fmtH(s.average)} h</strong>
        </div>
        <div className="mini-tile">
          <span>Night</span>
          <strong className="night-text">{fmtH(s.night)} h</strong>
        </div>
      </div>
    </section>
  );
}

export function HomeScreen() {
  const ref = useScrollRestore<HTMLDivElement>('home', useDemo((s) => s.setStatusDark));
  const offline = useDemo((s) => s.offline);
  const empty = useDemo((s) => s.empty);
  const allOpen = useDemo((s) => s.homeAllOpen);
  const toggleAll = useDemo((s) => s.toggleHomeAll);
  const expanded = useDemo((s) => s.expanded.home);
  const toggleExpanded = useDemo((s) => s.toggleExpanded);
  const navigate = useDemo((s) => s.navigate);
  const toast = useDemo((s) => s.showToast);
  const sn = smartNotes(empty ? [] : notes);

  return (
    <div className="screen" ref={ref}>
      <div className="sat-band" aria-hidden="true" />
      <GradientHeader className="gh-home grain-strong">
        <div className="home-top">
          <span className="avatar" aria-hidden="true">
            {person.initials}
          </span>
          <span className="home-greet">
            <span className="home-hello">Good morning, {person.firstName}</span>
            <span className="home-project">
              {project.name} · Shoot day {today.shootDay}
            </span>
          </span>
          <button type="button" className="icon-btn glass-btn" aria-label="Search notes" onClick={() => toast('Search is not part of this demo')}>
            <Icon name="search" size={20} color="#FFFFFF" />
          </button>
        </div>
        <h1 className="display">What's on your call sheet today?</h1>
        {offline && <OfflineBanner tone="dark" />}
        {sn.hero ? (
          <NextUpCard note={sn.hero} />
        ) : (
          <div className="empty-dark">
            <span className="empty-icon">
              <Icon name="calendar" size={24} color="#FFFFFF" />
            </span>
            <strong>Nothing on your sheet yet</strong>
            <span>When production sends travel or schedule info, it shows up here.</span>
          </div>
        )}
      </GradientHeader>

      <Sheet>
        <button type="button" className="todo-row" onClick={() => toast('The master data form is not part of this demo')}>
          <span className="todo-icon">
            <Icon name="idCard" size={20} color="#6B4A00" />
          </span>
          <span className="todo-titles">
            <span className="todo-t1">Submit master data</span>
            <span className="todo-t2">Payroll needs it before your first payout</span>
          </span>
          <Icon name="right" size={18} color="#54686C" />
        </button>

        {sn.top.length > 0 ? (
          <section className="stack" aria-label="Smart notes">
            <SectionHead title="Smart notes" sub="Call times and travel first, then the rest." link="Calendar" onLink={() => navigate({ name: 'calendar' })} />
            {sn.top.map((n) => (
              <ContentCard key={n.id} note={n} />
            ))}
            {sn.restCount > 0 && (
              <>
                <Collapse open={allOpen} id="more-notes">
                  <div className="stack">
                    {sn.rest.map((g) => (
                      <div className="day-group" key={g.label}>
                        <span className="day-group-h">
                          <strong>{g.label}</strong> · {g.sub}
                        </span>
                        {g.notes.map((n) => (
                          <NoteRow key={n.id} note={n} open={expanded === n.id} onToggle={() => toggleExpanded('home', n.id)} />
                        ))}
                      </div>
                    ))}
                  </div>
                </Collapse>
                <button type="button" className="btn btn-outline btn-md" aria-expanded={allOpen} aria-controls="more-notes" onClick={toggleAll}>
                  {allOpen ? 'Show fewer notes' : `Show ${sn.restCount} more notes`}
                  <span className="chev" data-open={allOpen}>
                    <Icon name="down" size={16} color="#111A1B" strokeWidth={1.8} />
                  </span>
                </button>
              </>
            )}
          </section>
        ) : (
          <div className="empty-light">
            <strong>No smart notes yet</strong>
            <span>Flights, hotels and call times from production land here, most important first.</span>
          </div>
        )}

        <WeekSection />

        <footer className="brand-footer">
          <Wordmark tone="dark" />
          <span className="brand-footer-line">Time tracking for film crews · Data hosted in Germany</span>
          <div className="footer-links">
            <button type="button" className="link-btn link-btn-plain" onClick={() => toast('Privacy policy is not part of this demo')}>
              Privacy
            </button>
            <button type="button" className="link-btn link-btn-plain" onClick={() => toast('Imprint is not part of this demo')}>
              Imprint
            </button>
          </div>
        </footer>
      </Sheet>
    </div>
  );
}
