// Pure checklist logic: no browser APIs, no UI. Everything here takes the
// step definitions plus saved state and derives what to show.
import type { Condition, FlagDef, PhaseDef, StepDef } from '../data/types';
import type { AppState, Character } from '../state/types';

export interface StepInstance {
  /** Key into state.current.checked. */
  key: string;
  step: StepDef;
  charId?: string;
}

export type FlagLookup = (flagId: string) => boolean;

export function evalCondition(cond: Condition | undefined, get: FlagLookup): boolean {
  if (!cond) return true;
  return (cond.all ?? []).every(get) && !(cond.none ?? []).some(get);
}

export function stepKey(stepId: string, charId?: string): string {
  return charId ? `${stepId}@${charId}` : stepId;
}

export function sortedParty(state: AppState): [string, Character][] {
  return Object.entries(state.party).sort(([, a], [, b]) => a.order - b.order);
}

/** Builds a flag reader. With a charId, character-scoped flags read that character's values. */
export function flagLookup(flagDefs: FlagDef[], state: AppState, charId?: string): FlagLookup {
  const byId = new Map(flagDefs.map((f) => [f.id, f]));
  return (id) => {
    const def = byId.get(id);
    const fallback = def?.default ?? false;
    switch (def?.scope) {
      case 'campaign':
        return state.campaignFlags[id] ?? fallback;
      case 'character':
        return charId ? (state.current.charFlags[charId]?.[id] ?? fallback) : false;
      case 'phase':
        return state.current.phaseFlags[id] ?? fallback;
      default:
        return false; // unknown flag id: treat as off
    }
  };
}

export function visibleSteps(phase: PhaseDef, flagDefs: FlagDef[], state: AppState): StepInstance[] {
  const shared = flagLookup(flagDefs, state);
  const party = sortedParty(state);
  const out: StepInstance[] = [];
  for (const step of phase.steps) {
    if (!step.perCharacter) {
      if (evalCondition(step.when, shared)) out.push({ key: stepKey(step.id), step });
      continue;
    }
    for (const [charId] of party) {
      if (evalCondition(step.when, flagLookup(flagDefs, state, charId))) {
        out.push({ key: stepKey(step.id, charId), step, charId });
      }
    }
  }
  return out;
}

export function hasPerCharacterSteps(phase: PhaseDef): boolean {
  return phase.steps.some((s) => s.perCharacter);
}

export interface PhaseProgress {
  done: number;
  total: number;
  complete: boolean;
}

export function phaseProgress(phase: PhaseDef, flagDefs: FlagDef[], state: AppState): PhaseProgress {
  const steps = visibleSteps(phase, flagDefs, state);
  const done = steps.filter((s) => state.current.checked[s.key]).length;
  // A per-character phase can't be finished until there's a party to do it.
  const needsParty = hasPerCharacterSteps(phase) && Object.keys(state.party).length === 0;
  return { done, total: steps.length, complete: !needsParty && done === steps.length };
}

/** The active phase is the first one that isn't complete; null when all are done. */
export function activePhaseId(phases: PhaseDef[], flagDefs: FlagDef[], state: AppState): string | null {
  return phases.find((p) => !phaseProgress(p, flagDefs, state).complete)?.id ?? null;
}

export function isOutpostPhaseComplete(phases: PhaseDef[], flagDefs: FlagDef[], state: AppState): boolean {
  return activePhaseId(phases, flagDefs, state) === null;
}

/** Toggles to show for a phase, split by scope, filtered by their showWhen. */
export function visibleFlags(phase: PhaseDef, flagDefs: FlagDef[], state: AppState, charId?: string): FlagDef[] {
  const get = flagLookup(flagDefs, state, charId);
  return phase.flags
    .map((id) => flagDefs.find((f) => f.id === id))
    .filter((f): f is FlagDef => !!f)
    .filter((f) => (charId ? f.scope === 'character' : f.scope !== 'character'))
    .filter((f) => evalCondition(f.showWhen, get));
}

/** Groups consecutive steps sharing a `group` so the UI can render sub-headings. */
export function groupSteps(steps: StepInstance[]): { group?: string; steps: StepInstance[] }[] {
  const out: { group?: string; steps: StepInstance[] }[] = [];
  for (const s of steps) {
    const last = out[out.length - 1];
    if (last && last.group === s.step.group) last.steps.push(s);
    else out.push({ group: s.step.group, steps: [s] });
  }
  return out;
}
