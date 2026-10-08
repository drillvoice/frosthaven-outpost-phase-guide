import { useState } from 'preact/hooks';
import { migrate } from '../state/migrate';
import type { Action } from '../state/actions';
import type { AppState } from '../state/types';
import { hashForGroup, sanitizeGroup } from '../route';
import { describeBackupAge, saveBackup, useInstall, useLastBackup, usePersistence } from './device';
import { formatDate } from './util';

interface Props {
  state: AppState;
  dispatch: (a: Action) => void;
  group: string;
  theme: 'dark' | 'light';
  onTheme: (t: 'dark' | 'light') => void;
}

export function LogView({ state, dispatch, group, theme, onTheme }: Props) {
  const entries = Object.entries(state.log).sort(([, a], [, b]) => b.endedAt.localeCompare(a.endedAt));
  const [groupInput, setGroupInput] = useState(group);
  const lastBackup = useLastBackup(group);
  const persistence = usePersistence();
  const install = useInstall();

  const importJson = async (file: File | undefined) => {
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (![1, 2].includes(data?.schemaVersion)) throw new Error('Not a backup from this app');
      if (confirm('Replace everything in this group with the backup?')) {
        dispatch({ type: 'replaceState', state: migrate(data, new Date().toISOString()) });
      }
    } catch (err) {
      alert(`Couldn't import: ${(err as Error).message}`);
    }
  };

  return (
    <div class="log">
      <h2>Log</h2>
      {entries.length === 0 && <p class="meta">Finished Outpost Phases appear here when you start a new one.</p>}
      <ul class="log-list">
        {entries.map(([id, e]) => (
          <li class="log-row" key={id}>
            <div>
              <div class="log-date">
                {formatDate(e.endedAt)}
                {e.week !== undefined && <span class="log-week"> · Week {e.week}</span>} {!e.complete && <span class="pill warn">unfinished</span>}
              </div>
              {e.note && <p class="log-note">{e.note}</p>}
            </div>
            <button
              type="button"
              class="icon-btn danger"
              aria-label="Delete log entry"
              onClick={() => confirm('Delete this log entry?') && dispatch({ type: 'deleteLogEntry', id })}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>

      <h2>Settings</h2>
      <div class="settings">
        <label class="toggle">
          <span class="toggle-label">Dark mode</span>
          <input type="checkbox" role="switch" checked={theme === 'dark'} onChange={(e) => onTheme(e.currentTarget.checked ? 'dark' : 'light')} />
          <span class="switch" aria-hidden="true" />
        </label>

        <form
          class="group-form"
          onSubmit={(e) => {
            e.preventDefault();
            const g = sanitizeGroup(groupInput);
            if (g) location.hash = hashForGroup(g);
          }}
        >
          <label class="note">
            <span>Group (stored on this device only for now)</span>
            <input value={groupInput} onInput={(e) => setGroupInput(e.currentTarget.value)} />
          </label>
          <button type="submit" class="btn" disabled={sanitizeGroup(groupInput) === group}>
            Switch group
          </button>
        </form>

        <div class="setting-block">
          <h3>Backups</h3>
          <p class="meta">
            Progress is saved only on this device, so clearing browser data or changing phones loses it. Back up after each Outpost Phase; on
            Android you can send the file straight to Google Drive. {describeBackupAge(lastBackup)}.
          </p>
          <div class="backup">
            <button type="button" class="btn" onClick={() => void saveBackup(state, group)}>
              Back up now
            </button>
            <label class="btn">
              Restore backup
              <input type="file" accept="application/json,.json" hidden onChange={(e) => importJson(e.currentTarget.files?.[0])} />
            </label>
          </div>
          {persistence && (
            <p class="meta" data-testid="persistence">
              {persistence === 'persisted'
                ? '✓ Storage is protected: the browser won\'t clear it to free up space.'
                : persistence === 'not-persisted'
                  ? 'The browser may clear storage if the phone runs low on space. Installing the app usually fixes this.'
                  : 'This browser can\'t protect storage from being cleared, so keep backups.'}
            </p>
          )}
        </div>

        <div class="setting-block">
          <h3>App</h3>
          {install.state === 'installed' && <p class="meta">✓ Installed as an app.</p>}
          {install.state === 'available' && (
            <>
              <p class="meta">Install to open it from your home screen, full screen and offline, like any other app.</p>
              <button type="button" class="btn btn-primary" onClick={() => void install.install()}>
                Install app
              </button>
            </>
          )}
          {install.state === 'manual' && (
            <p class="meta">
              To install, open the browser menu (⋮ in Chrome) and choose <strong>Install app</strong> or <strong>Add to Home screen</strong>. On
              iPhone, use Share → <strong>Add to Home Screen</strong>.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
