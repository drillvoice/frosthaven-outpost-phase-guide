import type { AppState } from './types';

/**
 * Persistence for one group's state. Today: localStorage on this device.
 * Later: a remote adapter (shared group URL + password) can implement the
 * same interface, keeping a local copy for offline use.
 */
export interface StorageAdapter {
  load(groupId: string): Promise<unknown>;
  save(groupId: string, state: AppState): Promise<void>;
  /** Notifies when the group's state changes elsewhere (another tab, later another phone). */
  subscribe?(groupId: string, onChange: (raw: unknown) => void): () => void;
}

const keyFor = (groupId: string) => `fh-outpost:group:${groupId}`;

export const localStorageAdapter: StorageAdapter = {
  async load(groupId) {
    try {
      const raw = localStorage.getItem(keyFor(groupId));
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  async save(groupId, state) {
    try {
      localStorage.setItem(keyFor(groupId), JSON.stringify(state));
    } catch {
      // Storage full or blocked (e.g. private mode); keep running in memory.
    }
  },
  subscribe(groupId, onChange) {
    const handler = (e: StorageEvent) => {
      if (e.key !== keyFor(groupId) || !e.newValue) return;
      try {
        onChange(JSON.parse(e.newValue));
      } catch {
        /* ignore malformed */
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  },
};
