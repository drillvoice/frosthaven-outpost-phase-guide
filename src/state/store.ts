import { reduce, type Action } from './actions';
import { migrate } from './migrate';
import type { StorageAdapter } from './storage';
import type { AppState } from './types';

export interface Store {
  getState(): AppState;
  dispatch(action: Action): void;
  subscribe(listener: () => void): () => void;
  dispose(): void;
}

export async function createStore(adapter: StorageAdapter, groupId: string): Promise<Store> {
  const now = () => new Date().toISOString();
  let state = migrate(await adapter.load(groupId), now());
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((l) => l());

  const unsubscribeRemote = adapter.subscribe?.(groupId, (raw) => {
    state = migrate(raw, now());
    notify();
  });

  return {
    getState: () => state,
    dispatch(action) {
      state = reduce(state, action);
      void adapter.save(groupId, state);
      notify();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    dispose() {
      unsubscribeRemote?.();
      listeners.clear();
    },
  };
}
