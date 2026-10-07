// How the calendar drives the checklist: marking the week, section steps,
// and the season.
import { describe, expect, it } from 'vitest';
import { flags, phases } from '../data/outpost-phase';
import { initialState, reduce, type Action } from '../state/actions';
import type { AppState } from '../state/types';
import { weeksMarked } from './calendar';
import { activePhaseId, flagLookup, phaseProgress, visibleSteps } from './checklist';

const NOW = '2026-01-01T00:00:00.000Z';
const apply = (s: AppState, ...actions: Action[]) => actions.reduce(reduce, s);
const time = phases.find((p) => p.id === 'time')!;
const keys = (s: AppState, phaseId = 'time') => visibleSteps(phases.find((p) => p.id === phaseId)!, flags, s).map((x) => x.key);
const markTick: Action = { type: 'toggleStep', key: 'time.mark', markWeek: { now: NOW } };
const section = (id: string, week: number, text: string): Action => ({ type: 'addCalendarEntry', id, entry: { week, kind: 'section', text }, now: NOW });
const atWeek9 = () => apply(initialState(NOW), { type: 'setWeeksMarked', weeks: 9, now: NOW });

describe('marking the week from the checklist', () => {
  it('ticking marks the next week; unticking undoes it', () => {
    let s = apply(atWeek9(), markTick);
    expect(weeksMarked(s.calendar!)).toBe(10);
    expect(s.current.markedWeek).toBe(10);
    s = apply(s, markTick);
    expect(weeksMarked(s.calendar!)).toBe(9);
    expect(s.current.markedWeek).toBeUndefined();
  });

  it('does not undo a mark if a later week was marked since', () => {
    let s = apply(atWeek9(), markTick, { type: 'markWeekOutside', now: NOW });
    expect(weeksMarked(s.calendar!)).toBe(11);
    s = apply(s, markTick);
    expect(weeksMarked(s.calendar!)).toBe(11);
  });

  it('is a plain tick when the calendar is not tracked', () => {
    const s = apply(initialState(NOW), markTick);
    expect(s.current.checked['time.mark']).toBe(true);
    expect(s.calendar).toBeUndefined();
  });

  it('starting a new phase logs the week and frees the next mark', () => {
    let s = apply(atWeek9(), markTick, { type: 'startNewPhase', logId: 'L', now: NOW, complete: true });
    expect(s.log.L.week).toBe(10);
    s = apply(s, markTick);
    expect(s.current.markedWeek).toBe(11);
  });
});

describe('sections in the marked week', () => {
  it('appear as steps after marking, and must be ticked to finish the phase', () => {
    let s = apply(atWeek9(), section('a', 10, '32.3'), section('b', 11, '99.1'));
    expect(keys(s)).not.toContain('cal:a');
    s = apply(s, markTick);
    expect(keys(s)).toContain('cal:a');
    expect(keys(s)).not.toContain('cal:b');
    expect(phaseProgress(time, flags, s).complete).toBe(false);
    s = apply(s, { type: 'toggleStep', key: 'cal:a' }, { type: 'toggleStep', key: 'time.toWinter' });
    expect(phaseProgress(time, flags, s).complete).toBe(true);
    expect(activePhaseId(phases, flags, s)).toBe('event');
  });

  it('notes in that week do not become steps', () => {
    const s = apply(atWeek9(), { type: 'addCalendarEntry', id: 'n', entry: { week: 10, kind: 'note', text: 'hi' }, now: NOW }, markTick);
    expect(keys(s).some((k) => k.startsWith('cal:'))).toBe(false);
  });
});

describe('season from the calendar', () => {
  it('hides the manual season step once the calendar is tracked', () => {
    expect(keys(initialState(NOW))).toContain('time.season');
    expect(keys(atWeek9())).not.toContain('time.season');
  });

  it('shows a season-change step only when the marked week completes a set of 10', () => {
    let s = apply(atWeek9(), markTick);
    expect(keys(s)).toContain('time.toWinter');
    expect(keys(s, 'event')).toContain('event.drawWinter');
    s = apply(s, { type: 'startNewPhase', logId: 'L', now: NOW, complete: true }, markTick);
    expect(s.current.markedWeek).toBe(11);
    expect(keys(s).filter((k) => k.startsWith('time.to'))).toEqual([]);
    expect(keys(s, 'event')).toContain('event.drawWinter');
  });

  it('switches back to summer at week 20', () => {
    const s = apply(initialState(NOW), { type: 'setWeeksMarked', weeks: 19, now: NOW }, markTick);
    expect(keys(s)).toContain('time.toSummer');
    expect(keys(s, 'event')).toContain('event.drawSummer');
  });

  it('overrides a stale manual winter setting', () => {
    const s = apply(initialState(NOW), { type: 'setCampaignFlag', flagId: 'winter', value: true }, { type: 'setWeeksMarked', weeks: 3, now: NOW });
    expect(flagLookup(flags, s)('winter')).toBe(false);
  });
});
