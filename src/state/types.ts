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
  /** Calendar week marked during this phase, if the calendar is tracked. */
  week?: number;
}

export type CalendarEntryKind = 'section' | 'note';

export interface CalendarEntry {
  week: number;
  kind: CalendarEntryKind;
  /** Section number (e.g. "32.3") or free-text note. */
  text: string;
  /** Moved forward because time passed outside an Outpost Phase. */
  carried?: boolean;
  createdAt: string;
}

export interface Calendar {
  /** week number -> when it was marked. Stored per week (not a count) so syncing devices can't double-count. */
  marked: Record<string, { at: string }>;
  entries: Record<string, CalendarEntry>;
}

export interface CurrentPhase {
  startedAt: string;
  phaseFlags: Record<string, boolean>;
  /** 'stepId', or 'cal:entryId' for calendar sections */
  checked: Record<string, true>;
  /** The calendar week marked by this Outpost Phase's Passage of Time step. */
  markedWeek?: number;
}

export interface AppState {
  schemaVersion: 2;
  party: Record<string, Character>;
  campaignFlags: Record<string, boolean>;
  /** stepId -> note; survives "Start new Outpost Phase". */
  houseNotes: Record<string, string>;
  log: Record<string, LogEntry>;
  current: CurrentPhase;
  /** Absent until the group sets up calendar tracking. */
  calendar?: Calendar;
  // Future: resources, buildings, morale, prosperity
}
