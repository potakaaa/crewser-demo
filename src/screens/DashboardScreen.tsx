import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { notes, person, today } from '../mock';
import { useActiveLink, useDemo } from '../store';
import { Icon } from '../components/Icon';
import { Collapse, GradientHeader, OfflineBanner, SectionHead, Sheet } from '../components/Layout';
import { ContentCard, NoteRow } from '../components/NoteCards';
import { Timeline, type TimelineHandle } from '../components/Timeline';
import { TodayCard } from '../components/TodayCard';
import { HoursStrip } from '../components/HoursStrip';
import { InfoPocket } from '../components/InfoPocket';
import { Wordmark } from '../components/Brand';
import { ActingAs } from '../components/ActingAs';
import { smartNotes } from '../lib/notes';
import { firstNameOf, greeting } from '../lib/greeting';
import { buildScrub, type Preview } from '../lib/timeline';
import { useScrollRestore } from '../lib/scroll';

export function DashboardScreen() {
  const ref = useScrollRestore<HTMLDivElement>('dashboard', useDemo((s) => s.setStatusDark));
  const offline = useDemo((s) => s.offline);
  const empty = useDemo((s) => s.empty);
  const allOpen = useDemo((s) => s.homeAllOpen);
  const toggleAll = useDemo((s) => s.toggleHomeAll);
  const expanded = useDemo((s) => s.expanded.dashboard);
  const toggleExpanded = useDemo((s) => s.toggleExpanded);
  const masterDataDone = useDemo((s) => s.masterDataDone);
  const openSheet = useDemo((s) => s.openSheet);
  const navigate = useDemo((s) => s.navigate);
  const toast = useDemo((s) => s.showToast);
  const link = useActiveLink();
  const sn = smartNotes(empty ? [] : notes);
  const hasNotes = sn.top.length + sn.restCount > 0;
  const scrub = useMemo(() => buildScrub(empty ? [] : notes), [empty]);
  // The note under the ruler's playhead; it only changes when the note does, never per pixel.
  const [preview, setPreview] = useState<Preview | null>(null);
  const ruler = useRef<TimelineHandle>(null);
  const backToNow = useCallback(() => ruler.current?.backToNow(), []);
  useEffect(() => setPreview(null), [scrub]);

  return (
    <div className="screen" ref={ref}>
      <div className="sat-band" aria-hidden="true" />
      <GradientHeader className="gh-home grain-strong gh-dash">
        <div className="home-top">
          <button type="button" className="dash-who" onClick={() => openSheet('project')}>
            <span className="avatar" aria-hidden="true">
              {link.initials}
            </span>
            <span className="home-greet">
              <span className="home-hello">
                {greeting()}, {link.isMe ? person.firstName : firstNameOf(link)}
              </span>
              <span className="home-project">
                {link.projectName} · Shoot day {today.shootDay}
                <Icon name="down" size={14} color="#C4CFD0" strokeWidth={2} />
                <span className="sr-only">. Switch project</span>
              </span>
            </span>
          </button>
          <button type="button" className="icon-btn glass-btn" aria-label="Search notes" onClick={() => toast('Search is not part of this demo')}>
            <Icon name="search" size={20} color="#FFFFFF" />
          </button>
        </div>
        <ActingAs />
        {offline && <OfflineBanner tone="dark" />}
        <Timeline scrub={scrub} preview={preview} onPreview={setPreview} handle={ruler} />
        <TodayCard hero={sn.hero} scrub={scrub} preview={preview} onBack={backToNow} />
      </GradientHeader>

      <Sheet className="sheet-dash">
        {link.isMe && !masterDataDone && (
          <button type="button" className="master" onClick={() => openSheet('info', 'master')}>
            <span className="master-icon">
              <Icon name="idCard" size={18} color="#111A1B" />
            </span>
            <span className="master-text">
              <span className="master-t1">Submit your master data</span>
              <span className="master-t2">Needed once, before your first payout.</span>
            </span>
            <Icon name="right" size={18} color="#111A1B" />
          </button>
        )}

        <HoursStrip />

        <InfoPocket notes={sn.undated} />

        {hasNotes ? (
          <section className="stack" aria-label="Smart notes">
            <SectionHead title="Smart notes" link="Calendar" onLink={() => navigate({ name: 'calendar' })} />
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
                          <NoteRow key={n.id} note={n} open={expanded === n.id} onToggle={() => toggleExpanded('dashboard', n.id)} />
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
