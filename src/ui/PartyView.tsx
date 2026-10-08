import { useState } from 'preact/hooks';
import { sortedParty } from '../logic/checklist';
import type { Action } from '../state/actions';
import type { AppState } from '../state/types';
import { newId } from './util';

interface Props {
  state: AppState;
  dispatch: (a: Action) => void;
}

export function PartyView({ state, dispatch }: Props) {
  const party = sortedParty(state);
  const [name, setName] = useState('');
  const [className, setClassName] = useState('');

  const add = (e: Event) => {
    e.preventDefault();
    if (!name.trim()) return;
    dispatch({ type: 'addCharacter', id: newId(), name: name.trim(), className: className.trim() });
    setName('');
    setClassName('');
  };

  return (
    <div class="party">
      <h2>Party</h2>
      <p class="meta">A roster of who's playing. Downtime is one shared list; each player handles their own character. The party stays when you start a new Outpost Phase.</p>
      <ul class="party-list">
        {party.map(([id, c], i) => (
          <li class="party-row" key={id}>
            <div class="party-fields">
              <input
                aria-label="Character name"
                value={c.name}
                placeholder="Name"
                onInput={(e) => dispatch({ type: 'updateCharacter', id, patch: { name: e.currentTarget.value } })}
              />
              <input
                aria-label="Class"
                value={c.className}
                placeholder="Class"
                onInput={(e) => dispatch({ type: 'updateCharacter', id, patch: { className: e.currentTarget.value } })}
              />
            </div>
            <div class="party-actions">
              <button type="button" class="icon-btn" aria-label="Move up" disabled={i === 0} onClick={() => dispatch({ type: 'moveCharacter', id, direction: -1 })}>
                ↑
              </button>
              <button type="button" class="icon-btn" aria-label="Move down" disabled={i === party.length - 1} onClick={() => dispatch({ type: 'moveCharacter', id, direction: 1 })}>
                ↓
              </button>
              <button
                type="button"
                class="icon-btn danger"
                aria-label={`Remove ${c.name}`}
                onClick={() => confirm(`Remove ${c.name || 'this character'} from the party?`) && dispatch({ type: 'removeCharacter', id })}
              >
                ✕
              </button>
            </div>
          </li>
        ))}
      </ul>
      <form class="party-add" onSubmit={add}>
        <h3>Add character</h3>
        <input value={name} placeholder="Name" aria-label="New character name" onInput={(e) => setName(e.currentTarget.value)} />
        <input value={className} placeholder="Class" aria-label="New character class" onInput={(e) => setClassName(e.currentTarget.value)} />
        <button type="submit" class="btn btn-primary btn-block" disabled={!name.trim()}>
          Add to party
        </button>
      </form>
    </div>
  );
}
