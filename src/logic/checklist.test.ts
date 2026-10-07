import { describe, expect, it } from 'vitest';
import { flags, phases } from '../data/outpost-phase';
import { initialState, reduce, type Action } from '../state/actions';
import type { AppState } from '../state/types';
import { activePhaseId, evalCondition, phaseProgress, visibleFlags, visibleSteps } from './checklist';

const NOW = '2026-01-01T00:00:00.000Z';
const phase = (id: string) => phases.find((p) => p.id === id)!;
const apply = (s: AppState, ...actions: Action[]) => actions.reduce(reduce, s);
const tickAll = (s: AppState, phaseId: string) =>
  visibleSteps(phase(phaseId), flags, s).reduce((acc, st) => reduce(acc, { type: 'toggleStep', key: st.key }), s);
const keys = (s: AppState, phaseId: string) => visibleSteps(phase(phaseId), flags, s).map((x) => x.key);

const withParty = () =>
  apply(
    initialState(NOW),
    { type: 'addCharacter', id: 'a', name: 'Ann', className: 'Drifter' },
    { type: 'addCharacter', id: 'b', name: 'Bo', className: 'Blinkblade' },
  );

describe('evalCondition', () => {
  const get = (id: string) => id === 'on';
  it('handles all/none', () => {
    expect(evalCondition(undefined, get)).toBe(true);
    expect(evalCondition({ all: ['on'] }, get)).toBe(true);
    expect(evalCondition({ all: ['on', 'off'] }, get)).toBe(false);
    expect(evalCondition({ none: ['off'] }, get)).toBe(true);
    expect(evalCondition({ all: ['on'], none: ['on'] }, get)).toBe(false);
  });
});

describe('visibility', () => {
  it('hides conditional steps until toggled', () => {
    const s = initialState(NOW);
    expect(keys(s, 'time')).toEqual(['time.mark']);
    const s2 = apply(s, { type: 'setPhaseFlag', flagId: 'sectionOnCalendar', value: true });
    expect(keys(s2, 'time')).toEqual(['time.mark', 'time.sections']);
  });

  it('switches summer/winter draw by the campaign winter flag', () => {
    const s = initialState(NOW);
    expect(keys(s, 'event')).toContain('event.drawSummer');
    const w = apply(s, { type: 'setCampaignFlag', flagId: 'winter', value: true });
    expect(keys(w, 'event')).toContain('event.drawWinter');
    expect(keys(w, 'event')).not.toContain('event.drawSummer');
  });

  it('shows attack steps only with an attack, and hides everything when the event is skipped', () => {
    const s = apply(initialState(NOW), { type: 'setPhaseFlag', flagId: 'attack', value: true });
    expect(keys(s, 'event')).toContain('event.attack.checks');
    expect(keys(s, 'event')).not.toContain('event.attack.noBarracks');
    const skipped = apply(s, { type: 'setPhaseFlag', flagId: 'skipEvent', value: true });
    expect(keys(skipped, 'event')).toEqual(['event.skipped']);
  });

  it('repeats downtime steps per character with their own flags', () => {
    const s = apply(withParty(), { type: 'setCharFlag', charId: 'b', flagId: 'retiring', value: true });
    const k = keys(s, 'downtime');
    expect(k).toContain('downtime.craft@a');
    expect(k).toContain('downtime.craft@b');
    expect(k).toContain('downtime.retire@b');
    expect(k).not.toContain('downtime.retire@a');
  });

  it('shows campaign flags in per-character steps (building 37)', () => {
    const s = apply(withParty(), { type: 'setCampaignFlag', flagId: 'building37', value: true });
    expect(keys(s, 'downtime')).toContain('downtime.purchase@a');
  });

  it('splits toggles by scope and respects showWhen', () => {
    const s = withParty();
    expect(visibleFlags(phase('downtime'), flags, s).map((f) => f.id)).toEqual(['building37']);
    expect(visibleFlags(phase('downtime'), flags, s, 'a').map((f) => f.id)).not.toContain('firstClassRetirement');
    const r = apply(s, { type: 'setCharFlag', charId: 'a', flagId: 'retiring', value: true });
    expect(visibleFlags(phase('downtime'), flags, r, 'a').map((f) => f.id)).toContain('firstClassRetirement');
  });
});

describe('progress and active phase', () => {
  it('starts on Passage of Time and advances as phases complete', () => {
    let s = withParty();
    expect(activePhaseId(phases, flags, s)).toBe('time');
    s = tickAll(s, 'time');
    expect(activePhaseId(phases, flags, s)).toBe('event');
    s = tickAll(s, 'event');
    s = tickAll(s, 'operations');
    expect(activePhaseId(phases, flags, s)).toBe('downtime');
    s = tickAll(s, 'downtime');
    s = tickAll(s, 'construction');
    expect(activePhaseId(phases, flags, s)).toBeNull();
  });

  it('goes back to a phase if a newly revealed step is unticked', () => {
    let s = tickAll(withParty(), 'time');
    expect(activePhaseId(phases, flags, s)).toBe('event');
    s = apply(s, { type: 'setPhaseFlag', flagId: 'seasonChange', value: true });
    expect(activePhaseId(phases, flags, s)).toBe('time');
  });

  it('does not complete Downtime without a party', () => {
    const s = initialState(NOW);
    expect(phaseProgress(phase('downtime'), flags, s)).toEqual({ done: 0, total: 0, complete: false });
  });

  it('ignores ticks on steps that are now hidden', () => {
    let s = apply(initialState(NOW), { type: 'setPhaseFlag', flagId: 'sectionOnCalendar', value: true });
    s = tickAll(s, 'time');
    s = apply(s, { type: 'setPhaseFlag', flagId: 'sectionOnCalendar', value: false });
    expect(phaseProgress(phase('time'), flags, s)).toEqual({ done: 1, total: 1, complete: true });
  });
});
