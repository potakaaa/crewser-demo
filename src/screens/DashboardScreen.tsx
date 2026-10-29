import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { notes } from '../mock';
import { useActiveLink, useDemo } from '../store';
import { Icon } from '../components/Icon';
import { Collapse, GradientHeader, OfflineBanner, SectionHead, Sheet } from '../components/Layout';
import { ContentCard } from '../components/NoteCards';
import { Timeline, type TimelineHandle } from '../components/Timeline';
import { TodayCard } from '../components/TodayCard';
import { TimerChip } from '../components/TimerChip';
import { WhoSwitch } from '../components/WhoSwitch';
import { SwitchPill, takeSwitchMotion, type SwitchMotion } from '../components/SwitchKit';
import { HoursStrip } from '../components/HoursStrip';
import { InfoPocket } from '../components/InfoPocket';
import { QuickActions } from '../components/QuickActions';
import { Wordmark } from '../components/Brand';
import { smartNotes, visibleNotes } from '../lib/notes';
import { buildScrub, type Preview } from '../lib/timeline';
import { useScrollRestore } from '../lib/scroll';

export function DashboardScreen() {
  const ref = useScrollRestore<HTMLDivElement>('dashboard', useDemo((s) => s.setStatusDark));
  const offline = useDemo((s) => s.offline);
  const empty = useDemo((s) => s.empty);
  const allOpen = useDemo((s) => s.homeAllOpen);
  const toggleAll = useDemo((s) => s.toggleHomeAll);
  const masterDataDone = useDemo((s) => s.masterDataDone);
  const toast = useDemo((s) => s.showToast);
  const link = useActiveLink();
  const shown = useMemo(() => visibleNotes(empty ? [] : notes, { masterDataDone, isMe: link.isMe }), [empty, masterDataDone, link.isMe]);
  const sn = smartNotes(shown);
  const hasNotes = sn.top.length + sn.restCount > 0;
  const scrub = useMemo(() => buildScrub(shown), [shown]);
  // The note under the ruler's playhead; it only changes when the note does, never per pixel.
  const [preview, setPreview] = useState<Preview | null>(null);
  const ruler = useRef<TimelineHandle>(null);
  const goTo = useCallback((i: number) => ruler.current?.goTo(i), []);
  useEffect(() => setPreview(null), [scrub]);

  // A switch to another person or project turns the screen over, even when the notes look the same: the deck
  // re-deals and the sheet slides in from the swipe's side, with a short flash of who you are now.
  // Switches from the sheet or Undo have no direction and just fade.
  const [turn, setTurn] = useState<{ n: number; kind: SwitchMotion['kind'] | 'fade'; dir: 1 | -1; undo?: string; pill: boolean } | null>(null);
  const [shownLink, setShownLink] = useState(link.id);
  if (shownLink !== link.id) {
    setShownLink(link.id);
    const m = takeSwitchMotion();
    setTurn({ n: (turn?.n ?? 0) + 1, kind: m?.kind ?? 'fade', dir: m?.dir ?? 1, undo: m?.from || undefined, pill: m?.origin !== 'pass' });
  }
  // A preview from the ruler belongs to the link it was made on: a switch starts the new one at Now.
  useEffect(() => {
    if (turn) ruler.current?.backToNow();
  }, [turn]);
  const turnClass = turn ? ` fx-in fx-${turn.kind}${turn.dir < 0 ? ' fx-rev' : ''}` : '';

  return (
    <div className="screen" ref={ref}>
      <div className="sat-band" aria-hidden="true" />
      <GradientHeader className="gh-home grain-strong gh-dash">
        <div className="home-top">
          <WhoSwitch />
          <TimerChip />
        </div>
        {offline && <OfflineBanner tone="dark" />}
        <Timeline scrub={scrub} preview={preview} onPreview={setPreview} handle={ruler} restStop={scrub.stops.findIndex((s) => s.note.id === sn.hero?.id)} />
        <div className={`fx-deck${turnClass}`} key={turn?.n ?? 0}>
          <TodayCard hero={sn.hero} scrub={scrub} preview={preview} onGoTo={goTo} />
          {turn?.pill && <SwitchPill n={turn.n} kind={turn.kind} undo={turn.undo} />}
        </div>
      </GradientHeader>

      <Sheet className={`sheet-dash${turnClass}`} key={turn?.n ?? 0}>
        <QuickActions />
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
                          <ContentCard key={n.id} note={n} />
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
