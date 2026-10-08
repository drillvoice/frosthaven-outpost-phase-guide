// Party level maths: no browser APIs, no UI.
import type { Character } from '../state/types';

export const MIN_LEVEL = 1;
export const MAX_LEVEL = 9;

/** Saves from before levels were tracked have none; every character starts at level 1. */
export const levelOf = (c: Character): number => c.level ?? MIN_LEVEL;

export const DIFFICULTIES = [
  { label: 'Easy', offset: -1 },
  { label: 'Normal', offset: 0 },
  { label: 'Hard', offset: 1 },
  { label: 'Very hard', offset: 2 },
] as const;

export interface PartyLevels {
  size: number;
  total: number;
  average: number;
  halfAverage: number;
  /** Normal difficulty: half the average level, rounded up. */
  scenarioLevel: number;
  /** Party levels still to gain before the scenario level goes up; null once it can't rise. */
  levelsToNext: number | null;
}

export function partyLevels(party: Character[]): PartyLevels | null {
  const size = party.length;
  if (size === 0) return null;
  const total = party.reduce((sum, c) => sum + levelOf(c), 0);
  const average = total / size;
  const scenarioLevel = Math.ceil(average / 2);
  // The scenario level rises once the total passes 2 × party size × current scenario level.
  const levelsToNext = 2 * size * scenarioLevel + 1 - total;
  return {
    size,
    total,
    average,
    halfAverage: average / 2,
    scenarioLevel,
    levelsToNext: total + levelsToNext <= size * MAX_LEVEL ? levelsToNext : null,
  };
}

/** Scenario level for a difficulty, never below 0. */
export const scenarioLevelAt = (base: number, offset: number) => Math.max(0, base + offset);
