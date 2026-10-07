import { initialState } from './actions';
import type { AppState } from './types';

/**
 * Upgrades saved data from older schema versions. Bump `schemaVersion` in
 * types.ts when the shape changes, add a step here, and add a frozen
 * fixture in __fixtures__ for the new version.
 */
export function migrate(raw: unknown, now: string): AppState {
  if (!raw || typeof raw !== 'object') return initialState(now);
  let data = raw as Record<string, unknown>;

  // v1 -> v2: calendar tracking added (absent until the group sets it up).
  if (data.schemaVersion === 1) data = { ...data, schemaVersion: 2 };

  if (data.schemaVersion !== 2) return initialState(now);
  const base = initialState(now);
  const loaded = data as Partial<AppState>;
  return {
    ...base,
    ...loaded,
    current: { ...base.current, ...loaded.current },
  } as AppState;
}
