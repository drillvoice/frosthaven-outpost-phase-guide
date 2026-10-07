import { useEffect, useRef, useState } from 'preact/hooks';
import { flags as flagDefs, phases } from '../data/outpost-phase';
import { activePhaseId, phaseProgress } from '../logic/checklist';
import type { Action } from '../state/actions';
import type { AppState } from '../state/types';
import { NewPhaseDialog } from './NewPhaseDialog';
import { PhaseSection } from './PhaseSection';
import { formatDate, newId } from './util';

interface Props {
  state: AppState;
  dispatch: (a: Action) => void;
  onGoToParty: () => void;
}

export function Checklist({ state, dispatch, onGoToParty }: Props) {
  const active = activePhaseId(phases, flagDefs, state);
  // Manual open/closed overrides; cleared whenever the active phase moves on.
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const prevActive = useRef(active);

  useEffect(() => {
    if (prevActive.current === active) return;
    prevActive.current = active;
    setOverrides({});
    if (active) {
      requestAnimationFrame(() =>
        document.getElementById(`phase-${active}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      );
    }
  }, [active]);

  const allDone = active === null;

  return (
    <div class="checklist">
      <p class="meta">Started {formatDate(state.current.startedAt)}</p>
      {phases.map((phase, i) => {
        const progress = phaseProgress(phase, flagDefs, state);
        const open = overrides[phase.id] ?? phase.id === active;
        return (
          <PhaseSection
            key={phase.id}
            phase={phase}
            index={i}
            state={state}
            dispatch={dispatch}
            progress={progress}
            isActive={phase.id === active}
            open={open}
            onToggleOpen={() => setOverrides({ ...overrides, [phase.id]: !open })}
            onGoToParty={onGoToParty}
          />
        );
      })}

      {allDone && (
        <div class="all-done">
          <strong>Outpost Phase complete.</strong> Head out on the next scenario.
        </div>
      )}
      <button type="button" class={`btn btn-block${allDone ? ' btn-primary' : ''}`} onClick={() => setDialogOpen(true)}>
        Start new Outpost Phase
      </button>

      {dialogOpen && (
        <NewPhaseDialog
          complete={allDone}
          onCancel={() => setDialogOpen(false)}
          onConfirm={(note) => {
            setDialogOpen(false);
            dispatch({ type: 'startNewPhase', logId: newId(), now: new Date().toISOString(), complete: allDone, note });
            window.scrollTo({ top: 0 });
          }}
        />
      )}
    </div>
  );
}
