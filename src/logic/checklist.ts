// Pure checklist logic: no browser APIs, no UI. Everything here takes the
// step definitions plus saved state and derives what to show.
import type { Condition, FlagDef, PhaseDef, StepDef } from '../data/types';
import type { AppState, Character } from '../state/types';
import { entriesForWeek, seasonAfter, weekChangesSeason, weeksMarked } from './calendar';

export interface StepInstance {
  /** Key into state.current.checked. */
  key: string;
  step: StepDef;
  /** Generated from a calendar entry rather than the step data. */
  calendarEntryId?: string;
}

export type FlagLookup = (flagId: string) => boolean;

export function evalCondition(cond: Condition | undefined, get: FlagLookup): boolean {
  if (!cond) return true;
  return (cond.all ?? []).every(get) && !(cond.none ?? []).some(get);
}

export function sortedParty(state: AppState): [string, Character][] {
  return Object.entries(state.party).sort(([, a], [, b]) => a.order - b.order);
}

/** Flag values worked out from tracked state. These override anything stored. */
export function derivedFlags(state: AppState): Record<string, boolean> {
  const cal = state.calendar;
  if (!cal) return { calendarOn: false, seasonChanged: false };
  const week = state.current.markedWeek;
  return {
    calendarOn: true,
    winter: seasonAfter(weeksMarked(cal)) === 'winter',
    seasonChanged: week !== undefined && !!cal.marked[week] && weekChangesSeason(week),
  };
}

export function flagLookup(flagDefs: FlagDef[], state: AppState): FlagLookup {
  const byId = new Map(flagDefs.map((f) => [f.id, f]));
  const derived = derivedFlags(state);
  return (id) => {
    if (id in derived) return derived[id];
    const def = byId.get(id);
    const fallback = def?.default ?? false;
    switch (def?.scope) {
      case 'campaign':
        return state.campaignFlags[id] ?? fallback;
      case 'phase':
        return state.current.phaseFlags[id] ?? fallback;
      case 'derived':
        return fallback;
      default:
        return false; // unknown flag id: treat as off
    }
  };
}

export function visibleSteps(phase: PhaseDef, flagDefs: FlagDef[], state: AppState): StepInstance[] {
  const get = flagLookup(flagDefs, state);
  const out: StepInstance[] = [];
  for (const step of phase.steps) {
    if (!evalCondition(step.when, get)) continue;
    out.push({ key: step.id, step });
    if (step.calendar === 'markWeek') out.push(...calendarSectionSteps(state));
  }
  return out;
}

/** Sections written in the week marked this phase, as steps to tick off. */
export function calendarSectionSteps(state: AppState): StepInstance[] {
  const week = state.current.markedWeek;
  if (!state.calendar || week === undefined) return [];
  return entriesForWeek(state.calendar, week)
    .filter((e) => e.kind === 'section')
    .map((e) => ({
      key: `cal:${e.id}`,
      calendarEntryId: e.id,
      step: {
        id: `cal:${e.id}`,
        title: `Read section ${e.text}`,
        reminder: `Written in week ${week} of the calendar${e.carried ? ' (carried over from an earlier week)' : ''}. Read it from the section book.`,
      },
    }));
}

export interface PhaseProgress {
  done: number;
  total: number;
  complete: boolean;
}

export function phaseProgress(phase: PhaseDef, flagDefs: FlagDef[], state: AppState): PhaseProgress {
  const steps = visibleSteps(phase, flagDefs, state);
  const done = steps.filter((s) => state.current.checked[s.key]).length;
  return { done, total: steps.length, complete: done === steps.length };
}

/** The active phase is the first one that isn't complete; null when all are done. */
export function activePhaseId(phases: PhaseDef[], flagDefs: FlagDef[], state: AppState): string | null {
  return phases.find((p) => !phaseProgress(p, flagDefs, state).complete)?.id ?? null;
}

export function isOutpostPhaseComplete(phases: PhaseDef[], flagDefs: FlagDef[], state: AppState): boolean {
  return activePhaseId(phases, flagDefs, state) === null;
}

/** Resolves toggle ids to definitions, keeping those whose showWhen holds. */
export function shownFlags(ids: string[], flagDefs: FlagDef[], state: AppState): FlagDef[] {
  const get = flagLookup(flagDefs, state);
  return ids
    .map((id) => flagDefs.find((f) => f.id === id))
    .filter((f): f is FlagDef => !!f && evalCondition(f.showWhen, get));
}

/** Toggles at the top of a phase. */
export function visibleFlags(phase: PhaseDef, flagDefs: FlagDef[], state: AppState): FlagDef[] {
  return shownFlags(phase.flags, flagDefs, state);
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
