import { useEffect, useRef, useState } from 'preact/hooks';
import {
  TOTAL_WEEKS,
  boxSeason,
  clampWeek,
  entriesForWeek,
  seasonAfter,
  upcomingEntries,
  weeksMarked,
  weeksUntilSeasonChange,
  type EntryWithId,
} from '../logic/calendar';
import type { Action } from '../state/actions';
import type { AppState, Calendar, CalendarEntryKind } from '../state/types';
import { newId } from './util';

interface Props {
  state: AppState;
  dispatch: (a: Action) => void;
}

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
const now = () => new Date().toISOString();

export function CalendarView({ state, dispatch }: Props) {
  const cal = state.calendar;
  const [openWeek, setOpenWeek] = useState<number | null>(null);
  if (!cal) return <CalendarSetup dispatch={dispatch} />;

  const marked = weeksMarked(cal);
  const season = seasonAfter(marked);
  const untilChange = weeksUntilSeasonChange(marked);
  const upcoming = upcomingEntries(cal);

  return (
    <div class="calendar">
      <h2>Calendar</h2>
      <p class="cal-summary">
        <strong>
          Week {marked} of {TOTAL_WEEKS} · {cap(season)}
        </strong>
        {marked < TOTAL_WEEKS && (
          <span>
            {' '}
            · {cap(seasonAfter(marked + untilChange))} {untilChange === 1 ? 'after the next week' : `in ${untilChange} weeks`}
          </span>
        )}
      </p>

      <AddEntryForm marked={marked} dispatch={dispatch} />

      <CalendarGrid cal={cal} marked={marked} onOpen={setOpenWeek} />

      <h3 class="cal-h">Coming up</h3>
      {upcoming.length === 0 ? (
        <p class="meta">Nothing written in future weeks yet.</p>
      ) : (
        <ul class="entry-list">
          {upcoming.map((e) => (
            <li key={e.id}>
              <button type="button" class="entry-row" onClick={() => setOpenWeek(e.week)}>
                <span class="entry-week">
                  Week {e.week}
                  <small>{e.week - marked === 1 ? 'next week' : `in ${e.week - marked} weeks`}</small>
                </span>
                <EntryText entry={e} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <h3 class="cal-h">Time passing elsewhere</h3>
      <div class="settings">
        <p class="meta">
          When a scenario or road event makes time pass, mark the week here. Anything written in that box isn't read yet: it moves on to the next empty
          week (p. 59).
        </p>
        <button
          type="button"
          class="btn"
          disabled={marked >= TOTAL_WEEKS}
          onClick={() =>
            confirm(`Mark week ${marked + 1} now, outside the Outpost Phase? Its entries move to week ${marked + 2}.`) &&
            dispatch({ type: 'markWeekOutside', now: now() })
          }
        >
          Mark week {Math.min(marked + 1, TOTAL_WEEKS)} now
        </button>
        <WeeksCorrection marked={marked} dispatch={dispatch} />
      </div>

      {openWeek !== null && <WeekDialog cal={cal} week={openWeek} marked={marked} dispatch={dispatch} onClose={() => setOpenWeek(null)} />}
    </div>
  );
}

function CalendarSetup({ dispatch }: { dispatch: (a: Action) => void }) {
  const [weeks, setWeeks] = useState(0);
  return (
    <div class="calendar">
      <h2>Calendar</h2>
      <div class="settings">
        <p>
          Track the campaign calendar here: the season switches automatically and anything written in a week shows up when that week is marked.
        </p>
        <label class="note">
          <span>How many boxes are already marked on your campaign sheet?</span>
          <Stepper value={weeks} min={0} max={TOTAL_WEEKS} onChange={setWeeks} label="Weeks marked" />
        </label>
        <p class="meta">
          That puts you in {seasonAfter(weeks)}. The next Outpost Phase marks week {Math.min(weeks + 1, TOTAL_WEEKS)}. You can add section numbers already
          written in future weeks on the next screen.
        </p>
        <button type="button" class="btn btn-primary" onClick={() => dispatch({ type: 'setWeeksMarked', weeks, now: now() })}>
          Start tracking the calendar
        </button>
      </div>
    </div>
  );
}

function Stepper({ value, min, max, onChange, label }: { value: number; min: number; max: number; onChange: (n: number) => void; label: string }) {
  const set = (n: number) => onChange(Math.min(max, Math.max(min, Number.isFinite(n) ? Math.round(n) : min)));
  return (
    <span class="stepper">
      <button type="button" class="icon-btn" aria-label={`${label}: fewer`} disabled={value <= min} onClick={() => set(value - 1)}>
        −
      </button>
      <input type="number" inputMode="numeric" aria-label={label} min={min} max={max} value={value} onInput={(e) => set(e.currentTarget.valueAsNumber)} />
      <button type="button" class="icon-btn" aria-label={`${label}: more`} disabled={value >= max} onClick={() => set(value + 1)}>
        +
      </button>
    </span>
  );
}

function AddEntryForm({ marked, dispatch, fixedWeek }: { marked: number; dispatch: (a: Action) => void; fixedWeek?: number }) {
  const [kind, setKind] = useState<CalendarEntryKind>('section');
  const [text, setText] = useState('');
  const [mode, setMode] = useState<'relative' | 'absolute'>('relative');
  const [n, setN] = useState(1);
  const [abs, setAbs] = useState(Math.min(marked + 1, TOTAL_WEEKS));
  const week = fixedWeek ?? (mode === 'relative' ? clampWeek(marked + n) : clampWeek(abs));

  return (
    <form
      class="add-entry"
      onSubmit={(e) => {
        e.preventDefault();
        if (!text.trim()) return;
        dispatch({ type: 'addCalendarEntry', id: newId(), entry: { week, kind, text }, now: now() });
        setText('');
      }}
    >
      {!fixedWeek && <h3>Add to a future week</h3>}
      <div class="segmented" role="radiogroup" aria-label="Entry type">
        {(['section', 'note'] as const).map((k) => (
          <button type="button" key={k} role="radio" aria-checked={kind === k} onClick={() => setKind(k)}>
            {k === 'section' ? 'Section' : 'Note'}
          </button>
        ))}
      </div>
      <input
        value={text}
        aria-label={kind === 'section' ? 'Section number' : 'Note'}
        placeholder={kind === 'section' ? 'Section number, e.g. 32.3' : 'Note, e.g. check Bo’s quest'}
        inputMode={kind === 'section' ? 'decimal' : 'text'}
        onInput={(e) => setText(e.currentTarget.value)}
      />
      {!fixedWeek && (
        <>
          <div class="segmented" role="radiogroup" aria-label="When">
            <button type="button" role="radio" aria-checked={mode === 'relative'} onClick={() => setMode('relative')}>
              Weeks from now
            </button>
            <button type="button" role="radio" aria-checked={mode === 'absolute'} onClick={() => setMode('absolute')}>
              Week number
            </button>
          </div>
          {mode === 'relative' ? (
            <Stepper value={n} min={1} max={Math.max(1, TOTAL_WEEKS - marked)} onChange={setN} label="Weeks from now" />
          ) : (
            <Stepper value={abs} min={1} max={TOTAL_WEEKS} onChange={setAbs} label="Week number" />
          )}
        </>
      )}
      <button type="submit" class="btn btn-primary btn-block" disabled={!text.trim()}>
        Add to week {week}
        {week <= marked && ' (already marked)'}
      </button>
    </form>
  );
}

function CalendarGrid({ cal, marked, onOpen }: { cal: Calendar; marked: number; onOpen: (w: number) => void }) {
  const counts = new Map<number, number>();
  for (const e of Object.values(cal.entries)) counts.set(e.week, (counts.get(e.week) ?? 0) + 1);
  const rows = Array.from({ length: TOTAL_WEEKS / 10 }, (_, r) => r);
  return (
    <div class="cal-grid" role="grid" aria-label="Campaign calendar">
      {rows.map((r) => {
        const first = r * 10 + 1;
        const season = boxSeason(first);
        return (
          <div class={`cal-row is-${season}`} role="row" key={r}>
            <span class="cal-row-label">
              {season === 'summer' ? 'Sum' : 'Win'} <small>Y{Math.floor(r / 2) + 1}</small>
            </span>
            {Array.from({ length: 10 }, (_, i) => {
              const w = first + i;
              const count = counts.get(w) ?? 0;
              const state = w <= marked ? 'is-marked' : w === marked + 1 ? 'is-next' : '';
              return (
                <button
                  type="button"
                  role="gridcell"
                  key={w}
                  class={`cal-box ${state}`}
                  aria-label={`Week ${w}${w <= marked ? ', marked' : ''}${count ? `, ${count} ${count === 1 ? 'entry' : 'entries'}` : ''}`}
                  onClick={() => onOpen(w)}
                >
                  {w <= marked ? '✕' : <span class="cal-num">{w}</span>}
                  {count > 0 && <span class="cal-badge">{count}</span>}
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function EntryText({ entry }: { entry: EntryWithId }) {
  return (
    <span class="entry-text">
      {entry.kind === 'section' ? <strong>Section {entry.text}</strong> : <span>📝 {entry.text}</span>}
      {entry.carried && <span class="pill">carried over</span>}
    </span>
  );
}

function WeekDialog({
  cal,
  week,
  marked,
  dispatch,
  onClose,
}: {
  cal: Calendar;
  week: number;
  marked: number;
  dispatch: (a: Action) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  const entries = entriesForWeek(cal, week);
  const status = week <= marked ? 'marked' : week === marked + 1 ? 'next to be marked' : `in ${week - marked} weeks`;
  return (
    <dialog ref={ref} class="dialog" onCancel={onClose} onClose={onClose}>
      {/* Focus the heading, not the first input, so the phone keyboard doesn't pop up. */}
      <h2 tabIndex={-1} autofocus class="dialog-title">
        Week {week}
      </h2>
      <p>
        {cap(boxSeason(week))} box · {status}
      </p>
      {entries.length === 0 ? (
        <p>Nothing written here.</p>
      ) : (
        <ul class="entry-list">
          {entries.map((e) => (
            <li key={e.id} class="entry-edit">
              <span class="entry-kind">{e.kind === 'section' ? 'Section' : 'Note'}</span>
              <input
                value={e.text}
                aria-label={`Edit ${e.kind}`}
                onChange={(ev) => dispatch({ type: 'updateCalendarEntry', id: e.id, patch: { text: ev.currentTarget.value } })}
              />
              <button
                type="button"
                class="icon-btn danger"
                aria-label={`Delete ${e.kind} ${e.text}`}
                onClick={() => dispatch({ type: 'removeCalendarEntry', id: e.id })}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
      <AddEntryForm marked={marked} dispatch={dispatch} fixedWeek={week} />
      <div class="dialog-actions">
        <button type="button" class="btn" onClick={onClose}>
          Done
        </button>
      </div>
    </dialog>
  );
}

function WeeksCorrection({ marked, dispatch }: { marked: number; dispatch: (a: Action) => void }) {
  const [value, setValue] = useState(marked);
  useEffect(() => setValue(marked), [marked]);
  return (
    <div class="group-form">
      <label class="note">
        <span>Fix weeks marked (to match the campaign sheet)</span>
        <Stepper value={value} min={0} max={TOTAL_WEEKS} onChange={setValue} label="Correct weeks marked" />
      </label>
      <button
        type="button"
        class="btn"
        disabled={value === marked}
        onClick={() => confirm(`Set the calendar to ${value} weeks marked?`) && dispatch({ type: 'setWeeksMarked', weeks: value, now: now() })}
      >
        Set to {value} weeks
      </button>
    </div>
  );
}
