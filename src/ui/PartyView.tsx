import { useState } from 'preact/hooks';
import { sortedParty } from '../logic/checklist';
import { DIFFICULTIES, MAX_LEVEL, MIN_LEVEL, levelOf, partyLevels, scenarioLevelAt } from '../logic/party';
import type { Action } from '../state/actions';
import type { AppState, Character } from '../state/types';
import { Stepper } from './Stepper';
import { newId } from './util';

interface Props {
  state: AppState;
  dispatch: (a: Action) => void;
}

export function PartyView({ state, dispatch }: Props) {
  const party = sortedParty(state);
  const [name, setName] = useState('');
  const [className, setClassName] = useState('');
  const [level, setLevel] = useState(MIN_LEVEL);

  const add = (e: Event) => {
    e.preventDefault();
    if (!name.trim()) return;
    dispatch({ type: 'addCharacter', id: newId(), name: name.trim(), className: className.trim(), level });
    setName('');
    setClassName('');
    setLevel(MIN_LEVEL);
  };

  return (
    <div class="party">
      <h2>Party</h2>
      <p class="meta">Keep levels up to date to see the scenario level and how close the next one is. The party stays when you start a new Outpost Phase.</p>
      <LevelSummary party={party.map(([, c]) => c)} />
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
              <div class="party-level">
                <span aria-hidden="true">Level</span>
                <Stepper
                  label={`Level of ${c.name || 'this character'}`}
                  value={levelOf(c)}
                  min={MIN_LEVEL}
                  max={MAX_LEVEL}
                  onChange={(n) => dispatch({ type: 'updateCharacter', id, patch: { level: n } })}
                />
              </div>
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
        <div class="party-level">
          <span aria-hidden="true">Level</span>
          <Stepper label="New character level" value={level} min={MIN_LEVEL} max={MAX_LEVEL} onChange={setLevel} />
        </div>
        <button type="submit" class="btn btn-primary btn-block" disabled={!name.trim()}>
          Add to party
        </button>
      </form>
    </div>
  );
}

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0$/, ''));

function LevelSummary({ party }: { party: Character[] }) {
  const lv = partyLevels(party);
  if (!lv) return null;
  return (
    <section class="level-summary" aria-label="Party level">
      <div class="level-head">
        <span class="level-big">
          <span class="level-num">{lv.scenarioLevel}</span>
          <span class="level-cap">Scenario level</span>
        </span>
        <span class="level-next">
          {lv.levelsToNext === null
            ? 'As high as it goes'
            : `${lv.levelsToNext} more level${lv.levelsToNext === 1 ? '' : 's'} across the party → ${lv.scenarioLevel + 1}`}
        </span>
      </div>
      <dl class="level-stats">
        <div>
          <dt>Total</dt>
          <dd>{lv.total}</dd>
        </div>
        <div>
          <dt>Average</dt>
          <dd>{fmt(lv.average)}</dd>
        </div>
        <div>
          <dt>Half avg.</dt>
          <dd>{fmt(lv.halfAverage)}</dd>
        </div>
      </dl>
      <dl class="level-stats">
        {DIFFICULTIES.map((d) => (
          <div key={d.label} class={d.offset === 0 ? 'is-normal' : ''}>
            <dt>{d.label}</dt>
            <dd>{scenarioLevelAt(lv.scenarioLevel, d.offset)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
