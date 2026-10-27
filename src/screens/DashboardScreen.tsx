import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { notes } from '../mock';
import { useActiveLink, useDemo } from '../store';
import { Icon } from '../components/Icon';
import { Collapse, GradientHeader, OfflineBanner, SectionHead, Sheet } from '../components/Layout';
import { ContentCard, NoteRow } from '../components/NoteCards';
import { Timeline, type TimelineHandle } from '../components/Timeline';
import { TodayCard } from '../components/TodayCard';
import { NotifButton } from '../components/NotifButton';
import { WhoSwitch, type SwitchMotion } from '../components/WhoSwitch';
import { HoursStrip } from '../components/HoursStrip';
import { InfoPocket } from '../components/InfoPocket';
import { QuickActions } from '../components/QuickActions';
import { Wordmark } from '../components/Brand';
import { smartNotes } from '../lib/notes';
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
  const toast = useDemo((s) => s.showToast);
  const link = useActiveLink();
  const sn = smartNotes(empty ? [] : notes);
  const hasNotes = sn.top.length + sn.restCount > 0;
  const scrub = useMemo(() => buildScrub(empty ? [] : notes), [empty]);
  // The note under the ruler's playhead; it only changes when the note does, never per pixel.
  const [preview, setPreview] = useState<Preview | null>(null);
  const ruler = useRef<TimelineHandle>(null);
  const goTo = useCallback((i: number) => ruler.current?.goTo(i), []);
  useEffect(() => setPreview(null), [scrub]);

  // A switch to another person or project turns the screen over, even when the notes look the same: the deck
  // re-deals and the sheet slides in from the swipe's side, with a short flash of who you are now.
  // Switches from the sheet or Undo have no direction and just fade.
  const motion = useRef<SwitchMotion | null>(null);
  const [turn, setTurn] = useState<{ n: number; kind: SwitchMotion['kind'] | 'fade'; dir: 1 | -1 } | null>(null);
  const [shownLink, setShownLink] = useState(link.id);
  if (shownLink !== link.id) {
    setShownLink(link.id);
    const m = motion.current;
    motion.current = null;
    setTurn({ n: (turn?.n ?? 0) + 1, kind: m?.kind ?? 'fade', dir: m?.dir ?? 1 });
  }
  const turnClass = turn ? ` fx-in fx-${turn.kind}${turn.dir < 0 ? ' fx-rev' : ''}` : '';

  return (
    <div className="screen" ref={ref}>
      <div className="sat-band" aria-hidden="true" />
      <GradientHeader className="gh-home grain-strong gh-dash">
        <div className="home-top">
          <WhoSwitch onSwitch={(m) => (motion.current = m)} />
          <NotifButton tone="dark" />
        </div>
        {offline && <OfflineBanner tone="dark" />}
        <Timeline scrub={scrub} preview={preview} onPreview={setPreview} handle={ruler} />
        <div className={`fx-deck${turnClass}`} key={turn?.n ?? 0}>
          <TodayCard hero={sn.hero} scrub={scrub} preview={preview} onGoTo={goTo} />
          {turn && (
            <div className="fx-flash" aria-hidden="true">
              <span className="fx-flash-av">{link.initials}</span>
              {turn.kind === 'project' ? link.projectName : link.isMe ? 'You' : link.personName} · {link.position}
            </div>
          )}
        </div>
      </GradientHeader>

      <Sheet className={`sheet-dash${turnClass}`} key={turn?.n ?? 0}>
        <QuickActions />
        {link.isMe && !masterDataDone && (
          <button type="button" className="master" onClick={() => openSheet('info', 'master')}>
            <span className="master-icon">
              <Icon name="idCard" size={18} color="currentColor" />
            </span>
            <span className="master-text">
              <span className="master-t1">Submit your master data</span>
              <span className="master-t2">Needed once, before your first payout.</span>
            </span>
            <Icon name="right" size={18} color="currentColor" />
          </button>
        )}

        <HoursStrip />

        <InfoPocket notes={sn.undated} />

        {hasNotes ? (
          <section className="stack" aria-label="Smart notes">
            <SectionHead title="Smart notes" />
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
                    <Icon name="down" size={16} color="currentColor" strokeWidth={1.8} />
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
          <Wordmark />
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
