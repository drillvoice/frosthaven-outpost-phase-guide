// Every change to saved state is a named action applied by `reduce`.
// A future sync layer can ship these actions between devices or replay them.
import type { AppState, Character, CurrentPhase } from './types';

export type Action =
  | { type: 'toggleStep'; key: string }
  | { type: 'setPhaseFlag'; flagId: string; value: boolean }
  | { type: 'setCharFlag'; charId: string; flagId: string; value: boolean }
  | { type: 'setCampaignFlag'; flagId: string; value: boolean }
  | { type: 'setHouseNote'; stepId: string; text: string }
  | { type: 'addCharacter'; id: string; name: string; className: string }
  | { type: 'updateCharacter'; id: string; patch: Partial<Pick<Character, 'name' | 'className'>> }
  | { type: 'moveCharacter'; id: string; direction: -1 | 1 }
  | { type: 'removeCharacter'; id: string }
  | { type: 'startNewPhase'; logId: string; now: string; complete: boolean; note?: string }
  | { type: 'deleteLogEntry'; id: string }
  | { type: 'replaceState'; state: AppState };

export function emptyPhase(now: string): CurrentPhase {
  return { startedAt: now, phaseFlags: {}, charFlags: {}, checked: {} };
}

export function initialState(now: string): AppState {
  return { schemaVersion: 1, party: {}, campaignFlags: {}, houseNotes: {}, log: {}, current: emptyPhase(now) };
}

function omit<T>(rec: Record<string, T>, key: string): Record<string, T> {
  const { [key]: _removed, ...rest } = rec;
  return rest;
}

export function reduce(state: AppState, action: Action): AppState {
  const cur = state.current;
  switch (action.type) {
    case 'toggleStep': {
      const checked = cur.checked[action.key] ? omit(cur.checked, action.key) : { ...cur.checked, [action.key]: true as const };
      return { ...state, current: { ...cur, checked } };
    }
    case 'setPhaseFlag':
      return { ...state, current: { ...cur, phaseFlags: { ...cur.phaseFlags, [action.flagId]: action.value } } };
    case 'setCharFlag': {
      const forChar = { ...cur.charFlags[action.charId], [action.flagId]: action.value };
      return { ...state, current: { ...cur, charFlags: { ...cur.charFlags, [action.charId]: forChar } } };
    }
    case 'setCampaignFlag':
      return { ...state, campaignFlags: { ...state.campaignFlags, [action.flagId]: action.value } };
    case 'setHouseNote':
      return {
        ...state,
        houseNotes: action.text.trim() ? { ...state.houseNotes, [action.stepId]: action.text } : omit(state.houseNotes, action.stepId),
      };
    case 'addCharacter': {
      const order = Math.max(-1, ...Object.values(state.party).map((c) => c.order)) + 1;
      return { ...state, party: { ...state.party, [action.id]: { name: action.name, className: action.className, order } } };
    }
    case 'updateCharacter': {
      const existing = state.party[action.id];
      if (!existing) return state;
      return { ...state, party: { ...state.party, [action.id]: { ...existing, ...action.patch } } };
    }
    case 'moveCharacter': {
      const sorted = Object.entries(state.party).sort(([, a], [, b]) => a.order - b.order);
      const i = sorted.findIndex(([id]) => id === action.id);
      const j = i + action.direction;
      if (i < 0 || j < 0 || j >= sorted.length) return state;
      [sorted[i], sorted[j]] = [sorted[j], sorted[i]];
      const party: AppState['party'] = {};
      sorted.forEach(([id, c], order) => (party[id] = { ...c, order }));
      return { ...state, party };
    }
    case 'removeCharacter': {
      const prefix = `@${action.id}`;
      const checked = Object.fromEntries(Object.entries(cur.checked).filter(([k]) => !k.endsWith(prefix))) as Record<string, true>;
      return {
        ...state,
        party: omit(state.party, action.id),
        current: { ...cur, checked, charFlags: omit(cur.charFlags, action.id) },
      };
    }
    case 'startNewPhase': {
      const entry = {
        startedAt: cur.startedAt,
        endedAt: action.now,
        complete: action.complete,
        ...(action.note?.trim() ? { note: action.note.trim() } : {}),
      };
      // Party, campaign flags and house notes carry over; ticks and per-phase toggles reset.
      return { ...state, log: { ...state.log, [action.logId]: entry }, current: emptyPhase(action.now) };
    }
    case 'deleteLogEntry':
      return { ...state, log: omit(state.log, action.id) };
    case 'replaceState':
      return action.state;
  }
}
