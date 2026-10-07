import { describe, expect, it } from 'vitest';
import { flags, phases } from '../data/outpost-phase';
import { activePhaseId, visibleSteps } from '../logic/checklist';
import { migrate } from './migrate';
import { localStorageAdapter, type StorageAdapter } from './storage';
import { createStore } from './store';
import type { AppState } from './types';
import saveV1 from './__fixtures__/save-v1.json';

// A copy of real saved data from schema v1. Never edit it: when the schema
// changes, add save-v2.json alongside and keep this test passing, so groups
// upgrading the app don't lose their progress.
describe('saved data compatibility', () => {
  it('loads a v1 save unchanged', () => {
    expect(migrate(structuredClone(saveV1), '2030-01-01T00:00:00.000Z')).toEqual(saveV1);
  });

  it('resumes a v1 save where it left off', () => {
    const s = migrate(structuredClone(saveV1), '2030-01-01T00:00:00.000Z');
    expect(activePhaseId(phases, flags, s)).toBe('event');
    const downtime = visibleSteps(phases.find((p) => p.id === 'downtime')!, flags, s).map((x) => x.key);
    expect(downtime).toContain('downtime.retire@c2');
    expect(downtime).not.toContain('downtime.retire@c1');
  });
});

function memoryAdapter(initial: unknown = null) {
  let saved: unknown = initial;
  const listeners = new Set<(raw: unknown) => void>();
  const adapter: StorageAdapter = {
    load: async () => saved,
    save: async (_group, state) => {
      saved = JSON.parse(JSON.stringify(state));
    },
    subscribe: (_group, cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
  };
  return { adapter, saved: () => saved as AppState, pushRemote: (raw: unknown) => listeners.forEach((l) => l(raw)) };
}

describe('createStore', () => {
  it('starts fresh when nothing is saved, and saves every action', async () => {
    const mem = memoryAdapter();
    const store = await createStore(mem.adapter, 'g');
    expect(store.getState().party).toEqual({});
    store.dispatch({ type: 'addCharacter', id: 'a', name: 'Ann', className: 'Drifter' });
    expect(mem.saved().party.a.name).toBe('Ann');
  });

  it('loads what was saved', async () => {
    const store = await createStore(memoryAdapter(saveV1).adapter, 'g');
    expect(store.getState().houseNotes['ops.resolve']).toBe('Remember the Garden bonus');
  });

  it('notifies listeners on local and remote changes, and stops after dispose', async () => {
    const mem = memoryAdapter();
    const store = await createStore(mem.adapter, 'g');
    let calls = 0;
    store.subscribe(() => calls++);
    store.dispatch({ type: 'toggleStep', key: 'time.mark' });
    mem.pushRemote(saveV1);
    expect(calls).toBe(2);
    expect(store.getState().party.c1.name).toBe('Ann');
    store.dispose();
    mem.pushRemote({ ...saveV1, party: {} });
    expect(calls).toBe(2);
  });
});

describe('localStorageAdapter', () => {
  function fakeBrowser() {
    const data = new Map<string, string>();
    const win = new EventTarget();
    Object.assign(globalThis, {
      window: win,
      localStorage: {
        getItem: (k: string) => data.get(k) ?? null,
        setItem: (k: string, v: string) => void data.set(k, v),
      },
    });
    const storageEvent = (key: string, newValue: string) => Object.assign(new Event('storage'), { key, newValue });
    return { data, win, storageEvent };
  }

  it('round-trips state per group', async () => {
    const { data } = fakeBrowser();
    await localStorageAdapter.save('slayers', saveV1 as AppState);
    expect(await localStorageAdapter.load('slayers')).toEqual(saveV1);
    expect(await localStorageAdapter.load('other')).toBeNull();
    expect([...data.keys()]).toEqual(['fh-outpost:group:slayers']);
  });

  it('treats corrupt data as nothing saved', async () => {
    const { data } = fakeBrowser();
    data.set('fh-outpost:group:g', '{not json');
    expect(await localStorageAdapter.load('g')).toBeNull();
  });

  it('hears changes from other tabs for the same group only', () => {
    const { win, storageEvent } = fakeBrowser();
    const seen: unknown[] = [];
    const stop = localStorageAdapter.subscribe!('g', (raw) => seen.push(raw));
    win.dispatchEvent(storageEvent('fh-outpost:group:other', '{"x":1}'));
    win.dispatchEvent(storageEvent('fh-outpost:group:g', '{"x":2}'));
    stop();
    win.dispatchEvent(storageEvent('fh-outpost:group:g', '{"x":3}'));
    expect(seen).toEqual([{ x: 2 }]);
  });
});
