import { useState } from 'preact/hooks';
import { flags as flagDefs } from '../data/outpost-phase';
import type { FlagDef, PhaseDef } from '../data/types';
import {
  flagLookup,
  groupSteps,
  hasPerCharacterSteps,
  shownFlags,
  sortedParty,
  visibleFlags,
  visibleSteps,
  type PhaseProgress,
  type StepInstance,
} from '../logic/checklist';
import type { Action } from '../state/actions';
import type { AppState } from '../state/types';
import { TOTAL_WEEKS, entriesForWeek, seasonAfter, weeksMarked } from '../logic/calendar';
import { FlagToggles } from './FlagToggles';
import { StepRow } from './StepRow';

interface Props {
  phase: PhaseDef;
  index: number;
  state: AppState;
  dispatch: (a: Action) => void;
  progress: PhaseProgress;
  isActive: boolean;
  open: boolean;
  onToggleOpen: () => void;
  onGoToParty: () => void;
}

export function PhaseSection({ phase, index, state, dispatch, progress, isActive, open, onToggleOpen, onGoToParty }: Props) {
  const steps = visibleSteps(phase, flagDefs, state);
  const sharedSteps = steps.filter((s) => !s.charId);
  const party = sortedParty(state);
  const perChar = hasPerCharacterSteps(phase);
  const status = progress.complete ? 'done' : isActive ? 'active' : 'pending';

  const setFlag = (charId?: string) => (f: FlagDef, value: boolean) => {
    if (f.scope === 'campaign') dispatch({ type: 'setCampaignFlag', flagId: f.id, value });
    else if (f.scope === 'character' && charId) dispatch({ type: 'setCharFlag', charId, flagId: f.id, value });
    else dispatch({ type: 'setPhaseFlag', flagId: f.id, value });
  };

  const renderSteps = (list: StepInstance[]) =>
    groupSteps(list).map((g, gi) => (
      <div class="step-group" key={gi}>
        {g.group && <h4 class="group-title">{g.group}</h4>}
        <ul class="steps">
          {g.steps.map((s) => (
            <StepRow
              key={s.key}
              instance={s}
              checked={!!state.current.checked[s.key]}
              note={state.houseNotes[s.step.id] ?? ''}
              onToggle={() =>
                dispatch({
                  type: 'toggleStep',
                  key: s.key,
                  ...(s.step.calendar === 'markWeek' ? { markWeek: { now: new Date().toISOString() } } : {}),
                })
              }
              onNote={s.calendarEntryId ? undefined : (text) => dispatch({ type: 'setHouseNote', stepId: s.step.id, text })}
            >
              {s.step.calendar === 'markWeek' && <CalendarWeekInfo state={state} />}
              {s.step.asks && (
                <FlagToggles
                  inline
                  flags={shownFlags(s.step.asks, flagDefs, state, s.charId)}
                  value={flagLookup(flagDefs, state, s.charId)}
                  onChange={setFlag(s.charId)}
                />
              )}
            </StepRow>
          ))}
        </ul>
      </div>
    ));

  return (
    <section class={`phase is-${status}`} id={`phase-${phase.id}`}>
      <button type="button" class="phase-head" aria-expanded={open} onClick={onToggleOpen}>
        <span class="phase-num" aria-hidden="true">
          {progress.complete ? '✓' : index + 1}
        </span>
        <span class="phase-title">
          {phase.title}
          <span class="phase-sub">
            p. {phase.pages}
            {isActive && ' · active'}
          </span>
        </span>
        <span class="phase-count">
          {progress.done}/{progress.total}
        </span>
        <span class={`chev${open ? ' is-open' : ''}`} aria-hidden="true" />
      </button>

      {open && (
        <div class="phase-body">
          <FlagToggles flags={visibleFlags(phase, flagDefs, state)} value={flagLookup(flagDefs, state)} onChange={setFlag()} />
          {renderSteps(sharedSteps)}
          {perChar && party.length === 0 && (
            <div class="empty">
              <p>Add your party to see each character's steps.</p>
              <button type="button" class="btn" onClick={onGoToParty}>
                Set up party
              </button>
            </div>
          )}
          {perChar &&
            party.map(([charId, c]) => (
              <CharacterBlock
                key={charId}
                name={c.name}
                className={c.className}
                flags={visibleFlags(phase, flagDefs, state, charId)}
                value={flagLookup(flagDefs, state, charId)}
                onFlag={setFlag(charId)}
                steps={steps.filter((s) => s.charId === charId)}
                checked={state.current.checked}
                renderSteps={renderSteps}
              />
            ))}
        </div>
      )}
    </section>
  );
}

interface CharProps {
  name: string;
  className: string;
  flags: FlagDef[];
  value: (id: string) => boolean;
  onFlag: (f: FlagDef, v: boolean) => void;
  steps: StepInstance[];
  checked: Record<string, true>;
  renderSteps: (list: StepInstance[]) => preact.JSX.Element[];
}

function CharacterBlock({ name, className, flags, value, onFlag, steps, checked, renderSteps }: CharProps) {
  const done = steps.filter((s) => checked[s.key]).length;
  const complete = done === steps.length;
  const [open, setOpen] = useState(true);
  return (
    <div class={`char${complete ? ' is-done' : ''}`}>
      <button type="button" class="char-head" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span class="char-name">
          {complete && '✓ '}
          {name || 'Unnamed'}
          {className && <span class="char-class"> · {className}</span>}
        </span>
        <span class="phase-count">
          {done}/{steps.length}
        </span>
        <span class={`chev${open ? ' is-open' : ''}`} aria-hidden="true" />
      </button>
      {open && (
        <div class="char-body">
          <FlagToggles flags={flags} value={value} onChange={onFlag} />
          {renderSteps(steps)}
        </div>
      )}
    </div>
  );
}

/** Under "Mark the next calendar box": which week gets marked, and that week's notes. */
function CalendarWeekInfo({ state }: { state: AppState }) {
  const cal = state.calendar;
  if (!cal) return <p class="step-aside">Tip: set up the Calendar tab and this step will mark the week and show its sections.</p>;
  const week = state.current.markedWeek;
  if (week === undefined) {
    const next = weeksMarked(cal) + 1;
    return <p class="step-aside">{next > TOTAL_WEEKS ? 'The calendar is full.' : `Ticking this marks week ${next} in the app.`}</p>;
  }
  const notes = entriesForWeek(cal, week).filter((e) => e.kind === 'note');
  return (
    <div class="step-aside">
      <p>
        Week {week} marked · now {seasonAfter(weeksMarked(cal))}
      </p>
      {notes.map((n) => (
        <p class="cal-note" key={n.id}>
          📝 {n.text}
          {n.carried && <span class="pill">carried over</span>}
        </p>
      ))}
    </div>
  );
}
