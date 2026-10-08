import { describe, expect, it } from 'vitest';
import { flags, phases } from '../data/outpost-phase';
import { initialState, reduce, type Action } from '../state/actions';
import type { AppState } from '../state/types';
import { activePhaseId, evalCondition, phaseProgress, shownFlags, visibleFlags, visibleSteps } from './checklist';

const NOW = '2026-01-01T00:00:00.000Z';
const phase = (id: string) => phases.find((p) => p.id === id)!;
const apply = (s: AppState, ...actions: Action[]) => actions.reduce(reduce, s);
const tickAll = (s: AppState, phaseId: string) =>
  visibleSteps(phase(phaseId), flags, s).reduce((acc, st) => reduce(acc, { type: 'toggleStep', key: st.key }), s);
const keys = (s: AppState, phaseId: string) => visibleSteps(phase(phaseId), flags, s).map((x) => x.key);

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
    expect(keys(s, 'construction')).toEqual(['build.decide']);
    const s2 = apply(s, { type: 'setPhaseFlag', flagId: 'building', value: true });
    expect(keys(s2, 'construction')).toEqual(['build.decide', 'build.pay', 'build.apply']);
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

  it('shows downtime once for the whole party, driven by shared toggles', () => {
    const s = initialState(NOW);
    expect(keys(s, 'downtime')).toEqual(['downtime.review', 'downtime.craft', 'downtime.brew', 'downtime.sell']);
    const r = apply(s, { type: 'setPhaseFlag', flagId: 'retiring', value: true }, { type: 'setCampaignFlag', flagId: 'building37', value: true });
    expect(keys(r, 'downtime')).toContain('downtime.retire');
    expect(keys(r, 'downtime')).toContain('downtime.purchase');
  });

  it('shows inline downtime toggles and respects showWhen', () => {
    const s = initialState(NOW);
    expect(visibleFlags(phase('downtime'), flags, s).map((f) => f.id)).toEqual(['building37']);
    const asks = phase('downtime').steps.find((st) => st.id === 'downtime.review')!.asks!;
    const ids = (st: AppState) => shownFlags(asks, flags, st).map((f) => f.id);
    expect(ids(s)).not.toContain('firstClassRetirement');
    expect(ids(apply(s, { type: 'setPhaseFlag', flagId: 'retiring', value: true }))).toContain('firstClassRetirement');
  });
});

describe('progress and active phase', () => {
  it('starts on Passage of Time and advances as phases complete', () => {
    let s = initialState(NOW);
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
    let s = tickAll(tickAll(initialState(NOW), 'time'), 'event');
    expect(activePhaseId(phases, flags, s)).toBe('operations');
    s = apply(s, { type: 'setPhaseFlag', flagId: 'attack', value: true });
    expect(activePhaseId(phases, flags, s)).toBe('event');
  });

  it('completes Downtime without a party set up', () => {
    const s = tickAll(initialState(NOW), 'downtime');
    expect(phaseProgress(phase('downtime'), flags, s)).toEqual({ done: 4, total: 4, complete: true });
  });

  it('ignores ticks on steps that are now hidden', () => {
    let s = apply(initialState(NOW), { type: 'setPhaseFlag', flagId: 'building', value: true });
    s = tickAll(s, 'construction');
    s = apply(s, { type: 'setPhaseFlag', flagId: 'building', value: false });
    expect(phaseProgress(phase('construction'), flags, s)).toEqual({ done: 1, total: 1, complete: true });
  });
});
