// Saved state for one group. Everything is a keyed map (no arrays) so a
// future sync layer can merge per key instead of overwriting whole lists.

export interface Character {
  name: string;
  className: string;
  /** Sort position in the party list. */
  order: number;
}

export interface LogEntry {
  startedAt: string;
  endedAt: string;
  /** False if the phase was reset before every step was ticked. */
  complete: boolean;
  note?: string;
}

export interface CurrentPhase {
  startedAt: string;
  phaseFlags: Record<string, boolean>;
  /** charId -> flagId -> value */
  charFlags: Record<string, Record<string, boolean>>;
  /** 'stepId' or 'stepId@charId' */
  checked: Record<string, true>;
}

export interface AppState {
  schemaVersion: 1;
  party: Record<string, Character>;
  campaignFlags: Record<string, boolean>;
  /** stepId -> note; survives "Start new Outpost Phase". */
  houseNotes: Record<string, string>;
  log: Record<string, LogEntry>;
  current: CurrentPhase;
  // Future: campaign?: { resources, buildings, calendar, morale, prosperity }
}
