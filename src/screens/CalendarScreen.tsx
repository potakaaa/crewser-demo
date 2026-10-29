import { useMemo, useRef } from 'react';
import '../styles/calendar.css';
import { useActiveLink, useDemo } from '../store';
import { docs, notes as allNotes, today, workdaysFor, type Doc, type Note, type WorkDay } from '../mock';
import { ForChip } from '../components/ForChip';
import { UnsentMark } from '../components/UnsentMark';
import { Icon } from '../components/Icon';
import { Collapse, GradientHeader, OfflineBanner, Sheet } from '../components/Layout';
import { ContentCard } from '../components/NoteCards';
import { addDays, dayOfMonth, diffDays, fmtDayMonth, fmtMonthYear, isSameMonth, monthGrid, monthLabel, mondayOf, relativeDay, weekday } from '../lib/dates';
import { sortNotes, visibleNotes } from '../lib/notes';
import { useScrollRestore } from '../lib/scroll';
import { useSubmitted } from '../lib/useSubmitted';

const count = (n: number) => (n === 1 ? '1 note' : `${n} notes`);

/** The call sheet for each shoot day; a day with one is a shoot day. */
const callSheetByDay = new Map<string, Doc>(docs.flatMap((d) => (d.kind === 'callsheet' && d.day ? [[d.day, d] as [string, Doc]] : [])));

/**
 * Past shoot days whose hours have not gone to production: logged as a draft, or not logged yet. Today never
 * counts: its hours cannot be due before the day is over.
 * The draft part must agree with hoursOverview's `unsent` (lib/stats.ts); days nobody logged are extra, which `unsent` cannot know about.
 */
function hoursNotSent(iso: string, submitted: string[], workdays: WorkDay[]): boolean {
  if (iso >= today.date || !callSheetByDay.has(iso)) return false;
  const logged = workdays.find((w) => w.date === iso);
  if (logged && logged.status !== 'draft') return false;
  return !submitted.includes(iso);
}

/** One badge on the day's disc when it has any note: it only says there is something inside. */
function Badge({ notes }: { notes: Note[] }) {
  return notes.length > 0 ? <i className="day-badge" /> : null;
}

/** The week strip's disc: the date, dimmer when the day holds no notes. */
function Disc({ iso, notes }: { iso: string; notes: Note[] }) {
  return (
    <span className={`wday-disc${notes.length ? ' has-notes' : ''}`}>
      {dayOfMonth(iso)}
      <Badge notes={notes} />
    </span>
  );
}

/** Which way the last prev/next went, so the new week or month slides in from that side. */
function useSlideDir(key: string) {
  const prev = useRef(key);
  const dir = useRef<'next' | 'prev' | 'none'>('none');
  if (prev.current !== key) {
    dir.current = key > prev.current ? 'next' : 'prev';
    prev.current = key;
  }
  return dir.current;
}

export function CalendarScreen() {
  const ref = useScrollRestore<HTMLDivElement>('calendar', useDemo((s) => s.setStatusDark));
  const offline = useDemo((s) => s.offline);
  const link = useActiveLink();
  const empty = useDemo((s) => s.empty);
  const calDate = useDemo((s) => s.calDate);
  const calMonth = useDemo((s) => s.calMonth);
  const monthOpen = useDemo((s) => s.calMonthOpen);
  const shiftCal = useDemo((s) => s.shiftCal);
  const setCalDate = useDemo((s) => s.setCalDate);
  const toggleMonth = useDemo((s) => s.toggleCalMonth);
  const openSheet = useDemo((s) => s.openSheet);
  const navigate = useDemo((s) => s.navigate);
  const openLog = useDemo((s) => s.setLogOpen);
  const submitted = useSubmitted();
  // The logged days belong to the crew link in use, so a colleague's link shows their hours, not yours.
  const workdays = workdaysFor(useDemo((s) => s.activeLinkId));

  const masterDataDone = useDemo((s) => s.masterDataDone);
  const notes = useMemo(() => visibleNotes(empty ? [] : allNotes, { masterDataDone, isMe: link.isMe }), [empty, masterDataDone, link.isMe]);
  const notesOn = (iso: string) => sortNotes(notes.filter((n) => n.day === iso));
  const monday = mondayOf(calDate);
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const weekDir = useSlideDir(monday);
  const monthDir = useSlideDir(calMonth);
  const grid = monthGrid(calMonth);

  const dayNotes = notesOn(calDate);
  const rel = relativeDay(calDate, today.date);
  const relWord = rel === 'today' || rel === 'tomorrow' || rel === 'yesterday' ? rel[0].toUpperCase() + rel.slice(1) : '';
  const unit = monthOpen ? 'month' : 'week';
  const dayAria = (iso: string, n: number) =>
    [
      `${iso === today.date ? 'Today, ' : ''}${fmtDayMonth(iso)}`,
      n ? count(n) : 'nothing planned',
      callSheetByDay.has(iso) && 'call sheet out',
      hoursNotSent(iso, submitted, workdays) && 'hours not sent',
    ]
      .filter(Boolean)
      .join(', ');
  const callSheet = callSheetByDay.get(calDate);
  const unsent = hoursNotSent(calDate, submitted, workdays);
  const isToday = calDate === today.date;
  // The Hours sheet only offers Send for logged drafts; a past shoot day nobody logged has nothing to send.
  const loggedDraft = workdays.some((w) => w.date === calDate && w.status === 'draft');
  const weekGap = Math.round(diffDays(monday, mondayOf(today.date)) / 7);
  const label = monthOpen ? fmtMonthYear(calMonth) : weekGap === 0 ? 'This Week' : weekGap === 1 ? 'Next Week' : weekGap === -1 ? 'Last Week' : monthLabel(days[0], days[6]);

  return (
    <div className="screen" ref={ref}>
      <div className="sat-band" aria-hidden="true" />
      <GradientHeader className="gh-compact">
        <div className="cal-bar">
          <h1 className="sr-only">Calendar</h1>
          <button type="button" className="cal-arrow" aria-label={`Previous ${unit}`} onClick={() => shiftCal(-1)}>
            <Icon name="left" size={16} color="currentColor" strokeWidth={1.8} />
          </button>
          <button type="button" className="cal-label" aria-expanded={monthOpen} aria-controls="cal-month" onClick={toggleMonth}>
            {label}
            <ForChip compact bare />
            <span className="chev" data-open={monthOpen}>
              <Icon name="down" size={14} color="currentColor" strokeWidth={1.8} />
            </span>
            <span className="sr-only">{monthOpen ? 'Show week' : 'Show whole month'}</span>
          </button>
          <button type="button" className="cal-arrow" aria-label={`Next ${unit}`} onClick={() => shiftCal(1)}>
            <Icon name="right" size={16} color="currentColor" strokeWidth={1.8} />
          </button>
          <button type="button" className="cal-today" onClick={() => setCalDate(today.date)}>
            Today
          </button>
        </div>

        <div className="cal-panel" data-guide="calendar">
          <Collapse open={!monthOpen}>
            <div className="week-strip" role="group" aria-label="Days of the week">
              <div key={monday} className={`week-days slide-${weekDir}`}>
                {days.map((iso) => {
                  const isSel = iso === calDate;
                  const dn = notesOn(iso);
                  return (
                    <button
                      type="button"
                      key={iso}
                      className={`wday${isSel ? ' is-sel' : ''}${iso === today.date ? ' is-today' : ''}`}
                      aria-pressed={isSel}
                      aria-label={dayAria(iso, dn.length)}
                      onClick={() => setCalDate(iso)}
                    >
                      <Disc iso={iso} notes={dn} />
                      <span className="wday-wd">{weekday(iso)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </Collapse>

          <Collapse open={monthOpen} id="cal-month">
            <div className="month" role="group" aria-label={fmtMonthYear(calMonth)}>
              <div className="month-head" aria-hidden="true">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                  <span key={i}>{d}</span>
                ))}
              </div>
              <div key={calMonth} className={`month-grid slide-${monthDir}`}>
                {grid.map((iso) => {
                  const isSel = iso === calDate;
                  const dn = notesOn(iso);
                  return (
                    <button
                      type="button"
                      key={iso}
                      className={`mday${isSel ? ' is-sel' : ''}${iso === today.date ? ' is-today' : ''}${isSameMonth(iso, calMonth) ? '' : ' is-out'}`}
                      aria-pressed={isSel}
                      aria-label={dayAria(iso, dn.length)}
                      onClick={() => setCalDate(iso)}
                    >
                      <span className="mday-d">
                        {dayOfMonth(iso)}
                        <Badge notes={dn} />
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </Collapse>
        </div>
      </GradientHeader>

      <Sheet className="sheet-cal">
        {offline && <OfflineBanner tone="dark" />}
        <div key={calDate} className="day-list">
          <h2 className="day-heading">
            {fmtDayMonth(calDate)}
            {(relWord || dayNotes.length > 0) && <span> · {[relWord, dayNotes.length > 0 && count(dayNotes.length)].filter(Boolean).join(' · ')}</span>}
          </h2>
          {(callSheet || unsent) && (
            <div className="day-actions">
              {callSheet && (
                <button type="button" className="day-action day-action-sheet" onClick={() => navigate({ name: 'pdf', file: callSheet.file })}>
                  <Icon name="file" size={16} color="#FFFFFF" />
                  Call sheet
                  {callSheet.isNew && <span className="chip-lime chip-lime-sm">new</span>}
                </button>
              )}
              {unsent && (isToday || loggedDraft) && (
                <button
                  type="button"
                  className="day-action day-action-unsent"
                  // Only today can be logged in the Log sheet; earlier logged days just need sending.
                  onClick={() => (isToday ? openLog(true) : openSheet('hours', 'week'))}
                >
                  <UnsentMark />
                  {isToday ? 'Hours not sent' : 'Hours not sent · Send'}
                </button>
              )}
              {unsent && !isToday && !loggedDraft && (
                <span className="day-action day-action-unsent" role="note">
                  <UnsentMark />
                  Hours not sent
                </span>
              )}
            </div>
          )}
          {dayNotes.length === 0 && <div className="empty-day">Nothing planned for this day</div>}
          {dayNotes.map((n) => (
            <ContentCard key={n.id} note={n} />
          ))}
        </div>
      </Sheet>
    </div>
  );
}
