import { useEffect, useState } from 'preact/hooks';
import { createStore, type Store } from '../state/store';
import { localStorageAdapter } from '../state/storage';
import { DEFAULT_GROUP, groupFromHash, hashForGroup } from '../route';
import { CalendarView } from './CalendarView';
import { Checklist } from './Checklist';
import { LogView } from './LogView';
import { PartyView } from './PartyView';
import { useStoreState } from './util';

type Tab = 'checklist' | 'calendar' | 'party' | 'log';
type Theme = 'dark' | 'light';

const LAST_GROUP_KEY = 'fh-outpost:lastGroup';
const THEME_KEY = 'fh-outpost:theme';

function readPref(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function writePref(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

export function Root() {
  const [group, setGroup] = useState(() => groupFromHash(location.hash) ?? readPref(LAST_GROUP_KEY) ?? DEFAULT_GROUP);
  const [store, setStore] = useState<Store | null>(null);

  useEffect(() => {
    const onHash = () => setGroup(groupFromHash(location.hash) ?? DEFAULT_GROUP);
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    if (groupFromHash(location.hash) !== group) history.replaceState(null, '', hashForGroup(group));
    writePref(LAST_GROUP_KEY, group);
    let created: Store | undefined;
    let cancelled = false;
    void createStore(localStorageAdapter, group).then((s) => {
      if (cancelled) return s.dispose();
      created = s;
      setStore(s);
    });
    return () => {
      cancelled = true;
      created?.dispose();
      setStore(null);
    };
  }, [group]);

  if (!store) return <div class="loading">Loading…</div>;
  return <App store={store} group={group} />;
}

function App({ store, group }: { store: Store; group: string }) {
  const state = useStoreState(store);
  const [tab, setTab] = useState<Tab>('checklist');
  const [theme, setTheme] = useState<Theme>(() => (readPref(THEME_KEY) === 'light' ? 'light' : 'dark'));

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    writePref(THEME_KEY, theme);
  }, [theme]);

  const go = (t: Tab) => {
    setTab(t);
    window.scrollTo({ top: 0 });
  };

  return (
    <>
      <header class="top">
        <h1>Outpost Phase</h1>
        <span class="group-chip" title="Group">
          {group}
        </span>
      </header>
      <main>
        {tab === 'checklist' && <Checklist state={state} dispatch={store.dispatch} onGoToParty={() => go('party')} />}
        {tab === 'calendar' && <CalendarView state={state} dispatch={store.dispatch} />}
        {tab === 'party' && <PartyView state={state} dispatch={store.dispatch} />}
        {tab === 'log' && <LogView state={state} dispatch={store.dispatch} group={group} theme={theme} onTheme={setTheme} />}
      </main>
      <nav class="tabs">
        {(
          [
            ['checklist', 'Checklist'],
            ['calendar', 'Calendar'],
            ['party', 'Party'],
            ['log', 'Log'],
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <button type="button" key={id} class={tab === id ? 'is-current' : ''} aria-current={tab === id ? 'page' : undefined} onClick={() => go(id)}>
            {label}
          </button>
        ))}
      </nav>
    </>
  );
}
