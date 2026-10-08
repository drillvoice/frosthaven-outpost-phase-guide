// Browser features that protect saved data: persistent storage, backups and
// installing as an app. Everything here degrades quietly where unsupported.
import { useEffect, useState } from 'preact/hooks';
import type { AppState } from '../state/types';

// --- Persistent storage ------------------------------------------------------

export type Persistence = 'persisted' | 'not-persisted' | 'unsupported';

/** Asks the browser not to clear our storage when space runs low. Safe to call repeatedly. */
export async function requestPersistence(): Promise<Persistence> {
  try {
    if (!navigator.storage?.persist) return 'unsupported';
    if (await navigator.storage.persisted()) return 'persisted';
    return (await navigator.storage.persist()) ? 'persisted' : 'not-persisted';
  } catch {
    return 'unsupported';
  }
}

export function usePersistence(): Persistence | null {
  const [p, setP] = useState<Persistence | null>(null);
  useEffect(() => {
    void requestPersistence().then(setP);
  }, []);
  return p;
}

// --- Backups -------------------------------------------------------------------

/** Remind people to back up once the last backup is older than this. */
export const BACKUP_DUE_DAYS = 14;
const DAY = 24 * 60 * 60 * 1000;

const lastBackupKey = (group: string) => `fh-outpost:lastBackup:${group}`;
const listeners = new Set<() => void>();

export function lastBackupAt(group: string): string | null {
  try {
    return localStorage.getItem(lastBackupKey(group));
  } catch {
    return null;
  }
}

function recordBackup(group: string) {
  try {
    localStorage.setItem(lastBackupKey(group), new Date().toISOString());
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

/** The last backup time for a group, updating when a backup is made anywhere in the app. */
export function useLastBackup(group: string): string | null {
  const [at, setAt] = useState(() => lastBackupAt(group));
  useEffect(() => {
    const update = () => setAt(lastBackupAt(group));
    update();
    listeners.add(update);
    return () => void listeners.delete(update);
  }, [group]);
  return at;
}

export function backupIsDue(at: string | null, now = Date.now()): boolean {
  return !at || now - Date.parse(at) > BACKUP_DUE_DAYS * DAY;
}

export function describeBackupAge(at: string | null, now = Date.now()): string {
  if (!at) return 'Never backed up on this device';
  const days = Math.floor((now - Date.parse(at)) / DAY);
  if (days <= 0) return 'Last backup: today';
  if (days === 1) return 'Last backup: yesterday';
  return `Last backup: ${days} days ago`;
}

/**
 * Saves a backup file. Where the browser can share files (Android Chrome),
 * opens the share sheet so it can go straight to Drive, email or a chat;
 * otherwise downloads it. Returns false if the person cancelled.
 */
export async function saveBackup(state: AppState, group: string): Promise<boolean> {
  const name = `outpost-${group}-${new Date().toISOString().slice(0, 10)}.json`;
  const json = JSON.stringify(state, null, 2);
  const file = new File([json], name, { type: 'application/json' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Outpost Phase backup' });
      recordBackup(group);
      return true;
    } catch (err) {
      if ((err as Error).name === 'AbortError') return false;
      // Sharing failed for another reason: fall back to a download.
    }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  recordBackup(group);
  return true;
}

// --- Install as an app -----------------------------------------------------------

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
/** Installed from this tab; the tab itself still runs in the browser, not as the app. */
let installedHere = false;
const installListeners = new Set<() => void>();
const notifyInstall = () => installListeners.forEach((l) => l());

/** Call once at startup: Chrome fires beforeinstallprompt early, before the UI mounts. */
export function captureInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // show our own button instead of Chrome's mini-infobar
    deferredPrompt = e as BeforeInstallPromptEvent;
    notifyInstall();
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    installedHere = true;
    notifyInstall();
  });
}

export const isRunningAsApp = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;

export type InstallState = 'installed' | 'available' | 'manual';

export function useInstall(): { state: InstallState; install: () => Promise<void> } {
  const read = (): InstallState => (isRunningAsApp() || installedHere ? 'installed' : deferredPrompt ? 'available' : 'manual');
  const [state, setState] = useState(read);
  useEffect(() => {
    const update = () => setState(read());
    installListeners.add(update);
    return () => void installListeners.delete(update);
  }, []);
  const install = async () => {
    if (!deferredPrompt) return;
    const prompt = deferredPrompt;
    await prompt.prompt();
    await prompt.userChoice;
    deferredPrompt = null; // a prompt can only be used once
    notifyInstall();
  };
  return { state, install };
}
