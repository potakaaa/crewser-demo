import { useRef, type CSSProperties } from 'react';
import '../styles/calendar.css';
import { useDemo } from '../store';
import { docs, notes as allNotes, today, workdaysFor, type Doc, type Note, type NoteType, type WorkDay } from '../mock';
import { ActingAs } from '../components/ActingAs';
import { Icon } from '../components/Icon';
import { Collapse, GradientHeader, OfflineBanner, Sheet } from '../components/Layout';
import { NoteRow } from '../components/NoteCards';
import { addDays, dayOfMonth, fmtDayMonth, fmtMonthYear, isSameMonth, isoWeek, monthGrid, monthLabel, mondayOf, relativeDay, weekday } from '../lib/dates';
import { sortNotes, TYPE_LABEL, undatedNotes } from '../lib/notes';
import { chipStyle, TYPE_COLOR } from '../lib/noteStyle';
import { useScrollRestore } from '../lib/scroll';
import { useSubmitted } from '../lib/useSubmitted';

const LEGEND: NoteType[] = ['appointment', 'flight', 'hotel', 'rental', 'plain'];
const count = (n: number) => (n === 1 ? '1 note' : `${n} notes`);

/** The call sheet for each shoot day; a day with one is a shoot day. */
const callSheetByDay = new Map<string, Doc>(docs.flatMap((d) => (d.kind === 'callsheet' && d.day ? [[d.day, d] as [string, Doc]] : [])));

/** Shoot days up to today whose hours have not gone to production: logged as a draft, or not logged yet. */
function hoursNotSent(iso: string, submitted: string[], workdays: WorkDay[]): boolean {
  if (iso > today.date || !callSheetByDay.has(iso)) return false;
  const logged = workdays.find((w) => w.date === iso);
  if (logged && logged.status !== 'draft') return false;
  return !submitted.includes(iso);
}

/** Small marks in the corner of a day: a call sheet is out, hours are still open. */
function DayMarks({ call, unsent }: { call: boolean; unsent: boolean }) {
  if (!call && !unsent) return null;
  return (
    <span className="day-marks" aria-hidden="true">
      {unsent && <i className="mark-unsent" />}
      {call && <Icon name="file" size={11} strokeWidth={2} />}
    </span>
  );
}

/** Up to three dots per day, coloured by note type. */
function Dots({ notes, onLight }: { notes: Note[]; onLight: boolean }) {
  return (
    <span className="wday-dots">
      {notes.slice(0, 3).map((n) => (
        <i key={n.id} style={{ background: onLight ? TYPE_COLOR[n.type].fg : TYPE_COLOR[n.type].dot }} />
      ))}
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
  const empty = useDemo((s) => s.empty);
  const calDate = useDemo((s) => s.calDate);
  const calMonth = useDemo((s) => s.calMonth);
  const monthOpen = useDemo((s) => s.calMonthOpen);
  const shiftCal = useDemo((s) => s.shiftCal);
  const setCalDate = useDemo((s) => s.setCalDate);
  const toggleMonth = useDemo((s) => s.toggleCalMonth);
  const expanded = useDemo((s) => s.expanded.calendar);
  const toggleExpanded = useDemo((s) => s.toggleExpanded);
  const openSheet = useDemo((s) => s.openSheet);
  const navigate = useDemo((s) => s.navigate);
  const openLog = useDemo((s) => s.setLogOpen);
  const submitted = useSubmitted();
  // The logged days belong to the crew link in use, so a colleague's link shows their hours, not yours.
  const workdays = workdaysFor(useDemo((s) => s.activeLinkId));

  const notes = empty ? [] : allNotes;
  const notesOn = (iso: string) => sortNotes(notes.filter((n) => n.day === iso));
  const monday = mondayOf(calDate);
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const selIndex = days.indexOf(calDate);
  const weekDir = useSlideDir(monday);
  const monthDir = useSlideDir(calMonth);
  const grid = monthGrid(calMonth);

  const dayNotes = notesOn(calDate);
  const undated = undatedNotes(notes);
  const rel = relativeDay(calDate, today.date);
  const dayLabel = rel === 'today' ? `Today · ${fmtDayMonth(calDate)}` : rel === 'tomorrow' ? `Tomorrow · ${fmtDayMonth(calDate)}` : fmtDayMonth(calDate);
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

  return (
    <div className="screen" ref={ref}>
      <div className="sat-band" aria-hidden="true" />
      <GradientHeader className="gh-compact">
        <div className="gh-titlebar">
          <div className="gh-titles">
            <button type="button" className="month-toggle" aria-expanded={monthOpen} aria-controls="cal-month" onClick={toggleMonth}>
              <span>{monthOpen ? fmtMonthYear(calMonth) : `${monthLabel(days[0], days[6])} · CW ${isoWeek(monday)}`}</span>
              <span className="chev" data-open={monthOpen}>
                <Icon name="down" size={16} color="#C4CFD0" strokeWidth={1.8} />
              </span>
              <span className="sr-only">{monthOpen ? 'Show week' : 'Show whole month'}</span>
            </button>
            <h1 className="display">Calendar</h1>
          </div>
          <button type="button" className="icon-btn glass-btn" aria-label={`Previous ${unit}`} onClick={() => shiftCal(-1)}>
            <Icon name="left" size={18} color="#FFFFFF" />
          </button>
          <button type="button" className="icon-btn glass-btn" aria-label={`Next ${unit}`} onClick={() => shiftCal(1)}>
            <Icon name="right" size={18} color="#FFFFFF" />
          </button>
        </div>

        <ActingAs />

        <div className="cal-panel">
          <Collapse open={!monthOpen}>
            <div className="week-strip" role="group" aria-label="Days of the week">
              <span className="wday-indicator" style={{ '--i': selIndex } as CSSProperties} aria-hidden="true" />
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
                      <span className="wday-wd">{weekday(iso)}</span>
                      <span className="wday-d">{dayOfMonth(iso)}</span>
                      <Dots notes={dn} onLight={isSel} />
                      <DayMarks call={callSheetByDay.has(iso)} unsent={hoursNotSent(iso, submitted, workdays)} />
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
                      <span className="mday-d">{dayOfMonth(iso)}</span>
                      <Dots notes={dn} onLight={isSel} />
                      <DayMarks call={callSheetByDay.has(iso)} unsent={hoursNotSent(iso, submitted, workdays)} />
                    </button>
                  );
                })}
              </div>
              <div className="type-legend">
                {LEGEND.map((t) => (
                  <span key={t}>
                    <i style={{ background: TYPE_COLOR[t].dot }} />
                    {TYPE_LABEL[t]}
                  </span>
                ))}
              </div>
            </div>
          </Collapse>
        </div>
      </GradientHeader>

      <Sheet className="sheet-cal">
        {offline && <OfflineBanner tone="light" />}
        {undated.length > 0 && (
          <button type="button" className="undated-row" onClick={() => openSheet('note', undated[0].id)}>
            <span className="chip-icon" style={chipStyle(undated[0].type)}>
              <Icon name={undated[0].type} size={18} />
            </span>
            <span className="todo-titles">
              <span className="undated-t1">{undated.length === 1 ? '1 note without a date' : `${undated.length} notes without a date`}</span>
              <span className="undated-t2">{undated[0].title}</span>
            </span>
            <Icon name="right" size={18} color="#54686C" />
          </button>
        )}
        <div key={calDate} className="day-list">
          <div className="day-heading">
            <h2>{dayLabel}</h2>
            {dayNotes.length > 0 && <span>{count(dayNotes.length)}</span>}
          </div>
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
                  <Icon name="alert" size={15} color="#6B4A00" />
                  {isToday ? 'Hours not sent' : 'Hours not sent · Send'}
                </button>
              )}
              {unsent && !isToday && !loggedDraft && (
                <span className="day-action day-action-unsent" role="note">
                  <Icon name="alert" size={15} color="#6B4A00" />
                  Hours not sent
                </span>
              )}
            </div>
          )}
          {dayNotes.length === 0 && <div className="empty-day">Nothing planned for this day</div>}
          {dayNotes.map((n) => (
            <NoteRow key={n.id} note={n} withPrimary open={expanded === n.id} onToggle={() => toggleExpanded('calendar', n.id)} />
          ))}
        </div>
      </Sheet>
    </div>
  );
}
