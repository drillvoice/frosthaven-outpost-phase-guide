import { describe, expect, it } from 'vitest';
import { initialState, reduce, type Action } from './actions';
import { migrate } from './migrate';
import type { AppState } from './types';

const NOW = '2026-01-01T00:00:00.000Z';
const LATER = '2026-01-08T00:00:00.000Z';
const apply = (s: AppState, ...actions: Action[]) => actions.reduce(reduce, s);

describe('reduce', () => {
  it('toggles steps on and off', () => {
    const s = apply(initialState(NOW), { type: 'toggleStep', key: 'x' });
    expect(s.current.checked).toEqual({ x: true });
    expect(apply(s, { type: 'toggleStep', key: 'x' }).current.checked).toEqual({});
  });

  it('starting a new phase logs it and keeps party, notes and campaign flags', () => {
    const s = apply(
      initialState(NOW),
      { type: 'addCharacter', id: 'a', name: 'Ann', className: 'Drifter' },
      { type: 'setHouseNote', stepId: 'ops.resolve', text: 'Garden bonus!' },
      { type: 'setCampaignFlag', flagId: 'winter', value: true },
      { type: 'setPhaseFlag', flagId: 'attack', value: true },
      { type: 'setPhaseFlag', flagId: 'retiring', value: true },
      { type: 'toggleStep', key: 'time.mark' },
      { type: 'startNewPhase', logId: 'L1', now: LATER, complete: true, note: '  Won scenario 5  ' },
    );
    expect(s.log.L1).toEqual({ startedAt: NOW, endedAt: LATER, complete: true, note: 'Won scenario 5' });
    expect(s.current).toEqual({ startedAt: LATER, phaseFlags: {}, checked: {} });
    expect(s.party.a.name).toBe('Ann');
    expect(s.houseNotes['ops.resolve']).toBe('Garden bonus!');
    expect(s.campaignFlags.winter).toBe(true);
  });

  it('clears empty house notes', () => {
    const s = apply(initialState(NOW), { type: 'setHouseNote', stepId: 'a', text: 'x' }, { type: 'setHouseNote', stepId: 'a', text: '  ' });
    expect(s.houseNotes).toEqual({});
  });

  it('reorders and removes characters', () => {
    let s = apply(
      initialState(NOW),
      { type: 'addCharacter', id: 'a', name: 'Ann', className: '' },
      { type: 'addCharacter', id: 'b', name: 'Bo', className: '' },
      { type: 'moveCharacter', id: 'b', direction: -1 },
    );
    expect(s.party.b.order).toBeLessThan(s.party.a.order);
    s = apply(s, { type: 'removeCharacter', id: 'a' });
    expect(Object.keys(s.party)).toEqual(['b']);
  });
});

describe('migrate', () => {
  it('returns a fresh state for missing or unknown data', () => {
    expect(migrate(null, NOW)).toEqual(initialState(NOW));
    expect(migrate({ schemaVersion: 99 }, NOW)).toEqual(initialState(NOW));
  });

  it('fills in missing fields of a v1 save', () => {
    const s = migrate({ schemaVersion: 1, party: { a: { name: 'Ann', className: '', order: 0 } } }, NOW);
    expect(s.party.a.name).toBe('Ann');
    expect(s.current.checked).toEqual({});
    expect(s.log).toEqual({});
  });
});
