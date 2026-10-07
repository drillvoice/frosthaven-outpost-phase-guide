import { useEffect, useReducer } from 'preact/hooks';
import type { Store } from '../state/store';

export function useStoreState(store: Store) {
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  useEffect(() => store.subscribe(() => rerender(undefined)), [store]);
  return store.getState();
}

export function newId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function buzz() {
  try {
    navigator.vibrate?.(8);
  } catch {
    /* not supported */
  }
}
