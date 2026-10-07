// Shapes for the step definitions in outpost-phase.ts.
// Only edit this file if you need a new *kind* of field; edit
// outpost-phase.ts to change the actual steps and reminders.

/**
 * Where a toggle's value lives:
 * - phase:     resets when a new Outpost Phase starts
 * - character: one value per character, resets each Outpost Phase
 * - campaign:  persists across Outpost Phases until you change it
 */
export type FlagScope = 'phase' | 'character' | 'campaign';

export interface Condition {
  /** Every listed flag must be on. */
  all?: string[];
  /** Every listed flag must be off. */
  none?: string[];
}

export interface FlagDef {
  id: string;
  /** Toggle text, phrased so "on" means yes. */
  label: string;
  scope: FlagScope;
  default?: boolean;
  /** Only show this toggle when the condition holds (e.g. a follow-up question). */
  showWhen?: Condition;
}

export interface StepDef {
  /** Stable key for ticks and house notes. Renaming it orphans saved notes. */
  id: string;
  title: string;
  /** One or two lines, in our own words. Refer to page/card numbers, never card text. */
  reminder: string;
  /** Step is hidden unless this holds. */
  when?: Condition;
  /** The party may choose to do it; a tick means "considered". */
  optional?: boolean;
  /** Repeat once per party member. */
  perCharacter?: boolean;
  /** Sub-heading within the phase; consecutive steps with the same group share it. */
  group?: string;
}

export interface PhaseDef {
  id: string;
  title: string;
  /** Rulebook page(s) for the phase. */
  pages: string;
  /** Toggles shown in this phase. Character-scoped ones appear per character. */
  flags: string[];
  steps: StepDef[];
}
