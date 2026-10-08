import { describe, expect, it } from 'vitest';
import type { Character } from '../state/types';
import { partyLevels, scenarioLevelAt } from './party';

const party = (...levels: (number | undefined)[]): Character[] => levels.map((level, order) => ({ name: '', className: '', order, level }));

describe('partyLevels', () => {
  it('is null for an empty party', () => {
    expect(partyLevels([])).toBeNull();
  });

  it('works out total, average, half and scenario level (half the average, rounded up)', () => {
    expect(partyLevels(party(3, 4, 4, 5))).toEqual({ size: 4, total: 16, average: 4, halfAverage: 2, scenarioLevel: 2, levelsToNext: 1 });
    expect(partyLevels(party(2, 3, 3))).toMatchObject({ total: 8, scenarioLevel: 2, levelsToNext: 5 });
  });

  it('treats characters saved without a level as level 1', () => {
    expect(partyLevels(party(undefined, undefined))).toMatchObject({ total: 2, scenarioLevel: 1, levelsToNext: 3 });
  });

  it('counts levels to the next scenario level, and stops when it cannot rise', () => {
    // 2 characters at level 2 → average 2 → scenario level 1; a third level tips it to 2.
    expect(partyLevels(party(2, 2))!.levelsToNext).toBe(1);
    expect(partyLevels(party(2, 3))!.scenarioLevel).toBe(2);
    expect(partyLevels(party(9, 9))).toMatchObject({ scenarioLevel: 5, levelsToNext: null });
  });
});

describe('scenarioLevelAt', () => {
  it('applies the difficulty offset without going below 0', () => {
    expect(scenarioLevelAt(1, -1)).toBe(0);
    expect(scenarioLevelAt(0, -1)).toBe(0);
    expect(scenarioLevelAt(3, 2)).toBe(5);
  });
});
