import { useState } from 'preact/hooks';
import { migrate } from '../state/migrate';
import type { Action } from '../state/actions';
import type { AppState } from '../state/types';
import { hashForGroup, sanitizeGroup } from '../route';
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

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `outpost-${group}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

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
                {formatDate(e.endedAt)} {!e.complete && <span class="pill warn">unfinished</span>}
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

        <div class="backup">
          <button type="button" class="btn" onClick={exportJson}>
            Export backup
          </button>
          <label class="btn">
            Import backup
            <input type="file" accept="application/json,.json" hidden onChange={(e) => importJson(e.currentTarget.files?.[0])} />
          </label>
        </div>
      </div>
    </div>
  );
}
