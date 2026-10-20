import { useDemo } from '../store';
import { notes as allNotes, today } from '../mock';
import { Icon } from '../components/Icon';
import { GradientHeader, OfflineBanner, ScreenTitle, Sheet } from '../components/Layout';
import { NoteRow } from '../components/NoteCards';
import { addDays, dayOfMonth, fmtDayMonth, isoWeek, monthLabel, mondayOf, relativeDay, weekday } from '../lib/dates';
import { sortNotes } from '../lib/notes';
import { useScrollRestore } from '../lib/scroll';

export function CalendarScreen() {
  const ref = useScrollRestore<HTMLDivElement>('calendar', useDemo((s) => s.setStatusDark));
  const offline = useDemo((s) => s.offline);
  const empty = useDemo((s) => s.empty);
  const offset = useDemo((s) => s.calWeekOffset);
  const dayIndex = useDemo((s) => s.calDayIndex);
  const shiftWeek = useDemo((s) => s.shiftWeek);
  const setCalDay = useDemo((s) => s.setCalDay);
  const expanded = useDemo((s) => s.expanded.calendar);
  const toggleExpanded = useDemo((s) => s.toggleExpanded);
  const navigate = useDemo((s) => s.navigate);

  const notes = empty ? [] : allNotes;
  const monday = addDays(mondayOf(today.date), offset * 7);
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const notesOn = (iso: string) => sortNotes(notes.filter((n) => n.day === iso));
  const selected = days[dayIndex];
  const dayNotes = notesOn(selected);
  const undated = notes.filter((n) => n.kind === 'undated');
  const rel = relativeDay(selected, today.date);
  const dayLabel = rel === 'today' ? `Today · ${fmtDayMonth(selected)}` : rel === 'tomorrow' ? `Tomorrow · ${fmtDayMonth(selected)}` : fmtDayMonth(selected);
  const count = (n: number) => (n === 1 ? '1 note' : `${n} notes`);

  return (
    <div className="screen" ref={ref}>
      <div className="sat-band" aria-hidden="true" />
      <GradientHeader className="gh-compact">
        <ScreenTitle eyebrow={`${monthLabel(days[0], days[6])} · CW ${isoWeek(monday)}`} title="Calendar">
          <button type="button" className="icon-btn glass-btn" aria-label="Previous week" onClick={() => shiftWeek(-1)}>
            <Icon name="left" size={18} color="#FFFFFF" />
          </button>
          <button type="button" className="icon-btn glass-btn" aria-label="Next week" onClick={() => shiftWeek(1)}>
            <Icon name="right" size={18} color="#FFFFFF" />
          </button>
        </ScreenTitle>
        <div className="week-strip" role="group" aria-label="Days of the week">
          {days.map((iso, i) => {
            const isSel = i === dayIndex;
            const isToday = iso === today.date;
            const n = notesOn(iso).length;
            return (
              <button
                type="button"
                key={iso}
                className={`wday${isSel ? ' is-sel' : ''}${isToday ? ' is-today' : ''}`}
                aria-pressed={isSel}
                aria-label={`${isToday ? 'Today, ' : ''}${fmtDayMonth(iso)}, ${n ? count(n) : 'nothing planned'}`}
                onClick={() => setCalDay(i)}
              >
                <span className="wday-wd">{weekday(iso)}</span>
                <span className="wday-d">{dayOfMonth(iso)}</span>
                <span className="wday-dots">
                  {Array.from({ length: Math.min(n, 3) }, (_, k) => (
                    <i key={k} />
                  ))}
                </span>
              </button>
            );
          })}
        </div>
      </GradientHeader>

      <Sheet className="sheet-cal">
        {offline && <OfflineBanner tone="light" />}
        {undated.length > 0 && (
          <button type="button" className="undated-row" onClick={() => navigate({ name: 'note', id: undated[0].id })}>
            <span className="chip-icon">
              <Icon name="plain" size={18} color="#2A3B3F" />
            </span>
            <span className="todo-titles">
              <span className="undated-t1">{undated.length === 1 ? '1 note without a date' : `${undated.length} notes without a date`}</span>
              <span className="undated-t2">{undated[0].title}</span>
            </span>
            <Icon name="right" size={18} color="#54686C" />
          </button>
        )}
        <div className="day-heading">
          <h2>{dayLabel}</h2>
          {dayNotes.length > 0 && <span>{count(dayNotes.length)}</span>}
        </div>
        {dayNotes.length === 0 && <div className="empty-day">Nothing planned for this day</div>}
        {dayNotes.map((n) => (
          <NoteRow key={n.id} note={n} withPrimary open={expanded === n.id} onToggle={() => toggleExpanded('calendar', n.id)} />
        ))}
      </Sheet>
    </div>
  );
}
