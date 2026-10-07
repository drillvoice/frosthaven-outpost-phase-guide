import { describe, expect, it } from 'vitest';
import { initialState, reduce, type Action } from '../state/actions';
import type { AppState } from '../state/types';
import {
  boxSeason,
  entriesForWeek,
  seasonAfter,
  upcomingEntries,
  weekChangesSeason,
  weeksMarked,
  weeksUntilSeasonChange,
} from './calendar';

const NOW = '2026-01-01T00:00:00.000Z';
const apply = (s: AppState, ...actions: Action[]) => actions.reduce(reduce, s);
const add = (id: string, week: number, text: string, kind: 'section' | 'note' = 'section'): Action => ({
  type: 'addCalendarEntry',
  id,
  entry: { week, kind, text },
  now: NOW,
});

describe('seasons', () => {
  it('starts in summer and flips every 10 weeks', () => {
    expect(seasonAfter(0)).toBe('summer');
    expect(seasonAfter(9)).toBe('summer');
    expect(seasonAfter(10)).toBe('winter');
    expect(seasonAfter(19)).toBe('winter');
    expect(seasonAfter(20)).toBe('summer');
    expect(seasonAfter(80)).toBe('summer');
  });

  it('colours boxes by row half', () => {
    expect(boxSeason(1)).toBe('summer');
    expect(boxSeason(10)).toBe('summer');
    expect(boxSeason(11)).toBe('winter');
    expect(boxSeason(20)).toBe('winter');
    expect(boxSeason(21)).toBe('summer');
  });

  it('knows when the season changes', () => {
    expect(weeksUntilSeasonChange(9)).toBe(1);
    expect(weeksUntilSeasonChange(10)).toBe(10);
    expect(weekChangesSeason(10)).toBe(true);
    expect(weekChangesSeason(11)).toBe(false);
  });
});

describe('calendar actions', () => {
  it('sets up from the current game state (e.g. 9 weeks done)', () => {
    const s = apply(initialState(NOW), { type: 'setWeeksMarked', weeks: 9, now: NOW });
    expect(weeksMarked(s.calendar!)).toBe(9);
    expect(Object.keys(s.calendar!.marked)).toHaveLength(9);
  });

  it('corrects weeks marked up or down, keeping entries', () => {
    let s = apply(initialState(NOW), { type: 'setWeeksMarked', weeks: 9, now: NOW }, add('a', 15, '32.3'));
    s = apply(s, { type: 'setWeeksMarked', weeks: 12, now: NOW });
    expect(weeksMarked(s.calendar!)).toBe(12);
    s = apply(s, { type: 'setWeeksMarked', weeks: 4, now: NOW });
    expect(weeksMarked(s.calendar!)).toBe(4);
    expect(s.calendar!.marked[5]).toBeUndefined();
    expect(s.calendar!.entries.a.week).toBe(15);
    expect(weeksMarked(apply(s, { type: 'setWeeksMarked', weeks: 500, now: NOW }).calendar!)).toBe(80);
  });

  it('adds, edits and removes entries; ignores blank text', () => {
    let s = apply(initialState(NOW), { type: 'setWeeksMarked', weeks: 9, now: NOW }, add('a', 12, ' 32.3 '), add('b', 12, '   '));
    expect(s.calendar!.entries.a.text).toBe('32.3');
    expect(s.calendar!.entries.b).toBeUndefined();
    s = apply(s, { type: 'updateCalendarEntry', id: 'a', patch: { text: '32.4', week: 99 } });
    expect(s.calendar!.entries.a).toMatchObject({ text: '32.4', week: 80 });
    expect(apply(s, { type: 'updateCalendarEntry', id: 'a', patch: { text: ' ' } }).calendar!.entries.a.text).toBe('32.4');
    s = apply(s, { type: 'removeCalendarEntry', id: 'a' });
    expect(s.calendar!.entries).toEqual({});
  });

  it('time passing outside the Outpost Phase carries that week\'s sections and notes forward', () => {
    let s = apply(
      initialState(NOW),
      { type: 'setWeeksMarked', weeks: 9, now: NOW },
      add('a', 10, '32.3'),
      add('b', 10, 'Bo quest', 'note'),
      add('c', 11, '64.2'),
    );
    s = apply(s, { type: 'markWeekOutside', now: NOW });
    expect(weeksMarked(s.calendar!)).toBe(10);
    expect(s.calendar!.entries.a).toMatchObject({ week: 11, carried: true });
    expect(s.calendar!.entries.b).toMatchObject({ week: 11, carried: true });
    expect(s.calendar!.entries.c.carried).toBeUndefined();
    expect(entriesForWeek(s.calendar!, 11).map((e) => e.id)).toEqual(['a', 'c', 'b']); // sections first, then notes
  });

  it('does nothing past week 80 or without a calendar', () => {
    const none = initialState(NOW);
    expect(apply(none, { type: 'markWeekOutside', now: NOW })).toBe(none);
    const full = apply(none, { type: 'setWeeksMarked', weeks: 80, now: NOW });
    expect(apply(full, { type: 'markWeekOutside', now: NOW })).toBe(full);
  });

  it('lists upcoming entries soonest first', () => {
    const s = apply(initialState(NOW), { type: 'setWeeksMarked', weeks: 9, now: NOW }, add('a', 20, 'x'), add('b', 5, 'old'), add('c', 10, 'y'));
    expect(upcomingEntries(s.calendar!).map((e) => e.id)).toEqual(['c', 'a']);
  });
});
