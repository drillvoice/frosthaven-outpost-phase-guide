// Every change to saved state is a named action applied by `reduce`.
// A future sync layer can ship these actions between devices or replay them.
import { TOTAL_WEEKS, clampWeek, weeksMarked } from '../logic/calendar';
import type { AppState, Calendar, CalendarEntry, Character, CurrentPhase } from './types';

export type Action =
  /** markWeek: the step is tied to the calendar, so ticking marks the next week and unticking undoes it. */
  | { type: 'toggleStep'; key: string; markWeek?: { now: string } }
  | { type: 'setPhaseFlag'; flagId: string; value: boolean }
  | { type: 'setCampaignFlag'; flagId: string; value: boolean }
  | { type: 'setHouseNote'; stepId: string; text: string }
  | { type: 'addCharacter'; id: string; name: string; className: string; level?: number }
  | { type: 'updateCharacter'; id: string; patch: Partial<Pick<Character, 'name' | 'className' | 'level'>> }
  | { type: 'moveCharacter'; id: string; direction: -1 | 1 }
  | { type: 'removeCharacter'; id: string }
  | { type: 'startNewPhase'; logId: string; now: string; complete: boolean; note?: string }
  | { type: 'deleteLogEntry'; id: string }
  /** Sets up calendar tracking (if needed) with weeks 1..weeks marked; also used to correct mistakes. */
  | { type: 'setWeeksMarked'; weeks: number; now: string }
  /** Time passes outside an Outpost Phase: mark the next week and push its entries on to the following week (p. 59). */
  | { type: 'markWeekOutside'; now: string }
  | { type: 'addCalendarEntry'; id: string; entry: Omit<CalendarEntry, 'createdAt'>; now: string }
  | { type: 'updateCalendarEntry'; id: string; patch: Partial<Pick<CalendarEntry, 'text' | 'week'>> }
  | { type: 'removeCalendarEntry'; id: string }
  | { type: 'replaceState'; state: AppState };

export function emptyPhase(now: string): CurrentPhase {
  return { startedAt: now, phaseFlags: {}, checked: {} };
}

export function initialState(now: string): AppState {
  return { schemaVersion: 2, party: {}, campaignFlags: {}, houseNotes: {}, log: {}, current: emptyPhase(now) };
}

function omit<T>(rec: Record<string, T>, key: string): Record<string, T> {
  const { [key]: _removed, ...rest } = rec;
  return rest;
}

/** Marks (or un-marks) this Outpost Phase's calendar week alongside the Passage of Time tick. */
function markWeekForPhase(state: AppState, ticking: boolean, now: string): AppState {
  const cal = state.calendar;
  const cur = state.current;
  if (!cal) return state;
  if (ticking) {
    if (cur.markedWeek !== undefined) return state;
    const week = weeksMarked(cal) + 1;
    if (week > TOTAL_WEEKS) return state;
    return { ...state, calendar: { ...cal, marked: { ...cal.marked, [week]: { at: now } } }, current: { ...cur, markedWeek: week } };
  }
  const week = cur.markedWeek;
  if (week === undefined) return state;
  const { markedWeek: _dropped, ...rest } = cur;
  // Only undo the mark if nothing has been marked after it since.
  const marked = week === weeksMarked(cal) ? omit(cal.marked, String(week)) : cal.marked;
  return { ...state, calendar: { ...cal, marked }, current: rest };
}

const emptyCalendar = (): Calendar => ({ marked: {}, entries: {} });

function withCalendar(state: AppState, update: (cal: Calendar) => Calendar): AppState {
  return { ...state, calendar: update(state.calendar ?? emptyCalendar()) };
}

export function reduce(state: AppState, action: Action): AppState {
  const cur = state.current;
  switch (action.type) {
    case 'toggleStep': {
      const ticking = !cur.checked[action.key];
      const checked = ticking ? { ...cur.checked, [action.key]: true as const } : omit(cur.checked, action.key);
      const next = { ...state, current: { ...cur, checked } };
      return action.markWeek ? markWeekForPhase(next, ticking, action.markWeek.now) : next;
    }
    case 'setPhaseFlag':
      return { ...state, current: { ...cur, phaseFlags: { ...cur.phaseFlags, [action.flagId]: action.value } } };
    case 'setCampaignFlag':
      return { ...state, campaignFlags: { ...state.campaignFlags, [action.flagId]: action.value } };
    case 'setHouseNote':
      return {
        ...state,
        houseNotes: action.text.trim() ? { ...state.houseNotes, [action.stepId]: action.text } : omit(state.houseNotes, action.stepId),
      };
    case 'addCharacter': {
      const order = Math.max(-1, ...Object.values(state.party).map((c) => c.order)) + 1;
      return { ...state, party: { ...state.party, [action.id]: { name: action.name, className: action.className, level: action.level ?? 1, order } } };
    }
    case 'updateCharacter': {
      const existing = state.party[action.id];
      if (!existing) return state;
      return { ...state, party: { ...state.party, [action.id]: { ...existing, ...action.patch } } };
    }
    case 'moveCharacter': {
      const sorted = Object.entries(state.party).sort(([, a], [, b]) => a.order - b.order);
      const i = sorted.findIndex(([id]) => id === action.id);
      const j = i + action.direction;
      if (i < 0 || j < 0 || j >= sorted.length) return state;
      [sorted[i], sorted[j]] = [sorted[j], sorted[i]];
      const party: AppState['party'] = {};
      sorted.forEach(([id, c], order) => (party[id] = { ...c, order }));
      return { ...state, party };
    }
    case 'removeCharacter':
      return { ...state, party: omit(state.party, action.id) };
    case 'startNewPhase': {
      const entry = {
        startedAt: cur.startedAt,
        endedAt: action.now,
        complete: action.complete,
        ...(action.note?.trim() ? { note: action.note.trim() } : {}),
        ...(cur.markedWeek !== undefined ? { week: cur.markedWeek } : {}),
      };
      // Party, campaign flags and house notes carry over; ticks and per-phase toggles reset.
      return { ...state, log: { ...state.log, [action.logId]: entry }, current: emptyPhase(action.now) };
    }
    case 'deleteLogEntry':
      return { ...state, log: omit(state.log, action.id) };
    case 'setWeeksMarked':
      return withCalendar(state, (cal) => {
        const weeks = Math.min(TOTAL_WEEKS, Math.max(0, Math.round(action.weeks)));
        const marked: Calendar['marked'] = {};
        for (let w = 1; w <= weeks; w++) marked[w] = cal.marked[w] ?? { at: action.now };
        return { ...cal, marked };
      });
    case 'markWeekOutside': {
      if (!state.calendar) return state;
      const week = weeksMarked(state.calendar) + 1;
      if (week > TOTAL_WEEKS) return state;
      return withCalendar(state, (cal) => {
        const entries = { ...cal.entries };
        if (week < TOTAL_WEEKS) {
          for (const [id, e] of Object.entries(entries)) {
            if (e.week === week) entries[id] = { ...e, week: week + 1, carried: true };
          }
        }
        return { marked: { ...cal.marked, [week]: { at: action.now } }, entries };
      });
    }
    case 'addCalendarEntry': {
      const text = action.entry.text.trim();
      if (!text) return state;
      const entry: CalendarEntry = { ...action.entry, text, week: clampWeek(action.entry.week), createdAt: action.now };
      return withCalendar(state, (cal) => ({ ...cal, entries: { ...cal.entries, [action.id]: entry } }));
    }
    case 'updateCalendarEntry': {
      const existing = state.calendar?.entries[action.id];
      if (!existing || action.patch.text?.trim() === '') return state;
      const patch = { ...action.patch, ...(action.patch.text !== undefined ? { text: action.patch.text.trim() } : {}), ...(action.patch.week !== undefined ? { week: clampWeek(action.patch.week) } : {}) };
      return withCalendar(state, (cal) => ({ ...cal, entries: { ...cal.entries, [action.id]: { ...existing, ...patch } } }));
    }
    case 'removeCalendarEntry':
      if (!state.calendar?.entries[action.id]) return state;
      return withCalendar(state, (cal) => ({ ...cal, entries: omit(cal.entries, action.id) }));
    case 'replaceState':
      return action.state;
  }
}
