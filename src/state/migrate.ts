import { initialState } from './actions';
import type { AppState } from './types';

/**
 * Upgrades saved data from older schema versions. Bump `schemaVersion` in
 * types.ts when the shape changes and add a step here.
 */
export function migrate(raw: unknown, now: string): AppState {
  if (!raw || typeof raw !== 'object') return initialState(now);
  const data = raw as Partial<AppState>;
  if (data.schemaVersion !== 1) return initialState(now);
  const base = initialState(now);
  return {
    ...base,
    ...data,
    current: { ...base.current, ...data.current },
  } as AppState;
}
