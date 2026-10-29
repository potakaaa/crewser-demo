import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { notes } from '../mock';
import { useActiveLink, useDemo } from '../store';
import { Icon } from '../components/Icon';
import { Collapse, GradientHeader, OfflineBanner, SectionHead, Sheet } from '../components/Layout';
import { ContentCard } from '../components/NoteCards';
import { Timeline, type TimelineHandle } from '../components/Timeline';
import { TodayCard } from '../components/TodayCard';
import { WhoSwitch } from '../components/WhoSwitch';
import { HoursStrip } from '../components/HoursStrip';
import { InfoPocket } from '../components/InfoPocket';
import { QuickActions } from '../components/QuickActions';
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
  const link = useActiveLink();
  const shown = useMemo(() => visibleNotes(empty ? [] : notes, { masterDataDone, isMe: link.isMe }), [empty, masterDataDone, link.isMe]);
  const sn = smartNotes(shown);
  const hasNotes = sn.top.length + sn.restCount > 0;
  const scrub = useMemo(() => buildScrub(shown), [shown]);
  // The list below the deck only holds what the deck does not already show.
  const more = useMemo(() => {
    const inDeck = new Set([sn.hero?.id, ...scrub.stops.map((s) => s.note.id)]);
    return smartNotes(shown.filter((n) => !inDeck.has(n.id)));
  }, [shown, scrub, sn.hero?.id]);
  // The note under the ruler's playhead; it only changes when the note does, never per pixel.
  const [preview, setPreview] = useState<Preview | null>(null);
  const ruler = useRef<TimelineHandle>(null);
  const goTo = useCallback((i: number) => ruler.current?.goTo(i), []);
  useEffect(() => setPreview(null), [scrub]);

  // A switch to another person or project turns the screen over, even when the notes look the same: the deck re-deals and the sheet fades in.
  const [turn, setTurn] = useState(0);
  const [shownLink, setShownLink] = useState(link.id);
  if (shownLink !== link.id) {
    setShownLink(link.id);
    setTurn(turn + 1);
  }
  // A preview from the ruler belongs to the link it was made on: a switch starts the new one at Now.
  useEffect(() => {
    if (turn) ruler.current?.backToNow();
  }, [turn]);
  const turnClass = turn ? ' fx-in fx-fade' : '';

  return (
    <div className="screen" ref={ref}>
      <div className="sat-band" aria-hidden="true" />
      <GradientHeader className="gh-home grain-strong gh-dash">
        <div className="home-top">
          <WhoSwitch />
        </div>
        {offline && <OfflineBanner tone="dark" />}
        <Timeline scrub={scrub} preview={preview} onPreview={setPreview} handle={ruler} restStop={scrub.stops.findIndex((s) => s.note.id === sn.hero?.id)} />
        <div className={`fx-deck${turnClass}`} key={turn}>
          <TodayCard hero={sn.hero} scrub={scrub} preview={preview} onGoTo={goTo} />
        </div>
      </GradientHeader>

      <Sheet className={`sheet-dash${turnClass}`} key={turn}>
        <QuickActions />
        <HoursStrip />

        <InfoPocket notes={sn.undated} />

        {!hasNotes ? (
          <div className="empty-light">
            <strong>No smart notes yet</strong>
            <span>Flights, hotels and call times from production land here, most important first.</span>
          </div>
        ) : more.top.length + more.restCount > 0 && (
          <section className="stack" aria-label="Smart notes">
            <SectionHead title="Smart notes" bar />
            {more.top.map((n) => (
              <ContentCard key={n.id} note={n} />
            ))}
            {more.restCount > 0 && (
              <>
                <Collapse open={allOpen} id="more-notes">
                  <div className="stack">
                    {more.rest.map((g) => (
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
                  {allOpen ? 'Show fewer notes' : `Show ${more.restCount} more notes`}
                  <span className="chev" data-open={allOpen}>
                    <Icon name="down" size={16} color="currentColor" strokeWidth={1.8} />
                  </span>
                </button>
              </>
            )}
          </section>
        )}
      </Sheet>
    </div>
  );
}
