// Pure calendar maths. The campaign sheet calendar has 80 weeks in rows of
// 20: the first 10 boxes of a row are summer, the last 10 winter. The
// campaign starts in summer, and filling a set of 10 boxes flips the season
// (p. 59).
import type { AppState, Calendar, CalendarEntry } from '../state/types';

export const TOTAL_WEEKS = 80;
export const SEASON_LENGTH = 10;

export type Season = 'summer' | 'winter';

/** Number of boxes marked, counting up from week 1 without gaps. */
export function weeksMarked(cal: Calendar): number {
  let n = 0;
  while (n < TOTAL_WEEKS && cal.marked[n + 1]) n++;
  return n;
}

/** The current season once `marked` boxes are filled. */
export function seasonAfter(marked: number): Season {
  return Math.floor(marked / SEASON_LENGTH) % 2 === 0 ? 'summer' : 'winter';
}

/** Which half of a calendar row a box sits in (for colouring the grid). */
export function boxSeason(week: number): Season {
  return seasonAfter(week - 1);
}

/** Weeks until the season next changes (1 = marking the next box changes it). */
export function weeksUntilSeasonChange(marked: number): number {
  return SEASON_LENGTH - (marked % SEASON_LENGTH);
}

export function currentSeason(state: AppState): Season | null {
  return state.calendar ? seasonAfter(weeksMarked(state.calendar)) : null;
}

/** True when marking this week completed a set of 10 and flipped the season. */
export function weekChangesSeason(week: number): boolean {
  return week % SEASON_LENGTH === 0;
}

export type EntryWithId = CalendarEntry & { id: string };

export function entriesForWeek(cal: Calendar, week: number): EntryWithId[] {
  return Object.entries(cal.entries)
    .filter(([, e]) => e.week === week)
    .map(([id, e]) => ({ id, ...e }))
    .sort((a, b) => (a.kind === b.kind ? a.createdAt.localeCompare(b.createdAt) : a.kind === 'section' ? -1 : 1));
}

/** Entries on weeks not yet marked, soonest first. */
export function upcomingEntries(cal: Calendar): EntryWithId[] {
  const marked = weeksMarked(cal);
  return Object.entries(cal.entries)
    .filter(([, e]) => e.week > marked)
    .map(([id, e]) => ({ id, ...e }))
    .sort((a, b) => a.week - b.week || a.createdAt.localeCompare(b.createdAt));
}

export function clampWeek(week: number): number {
  return Math.min(TOTAL_WEEKS, Math.max(1, Math.round(week)));
}
