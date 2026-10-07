// Sanity checks for the step data, so typos in outpost-phase.ts fail `npm test`.
import { describe, expect, it } from 'vitest';
import { evalCondition } from '../logic/checklist';
import { flags, phases } from './outpost-phase';

const flagIds = new Set(flags.map((f) => f.id));
const condFlags = (c?: { all?: string[]; none?: string[] }) => [...(c?.all ?? []), ...(c?.none ?? [])];

describe('outpost-phase data', () => {
  it('has unique step, phase and flag ids', () => {
    const stepIds = phases.flatMap((p) => p.steps.map((s) => s.id));
    expect(new Set(stepIds).size).toBe(stepIds.length);
    expect(new Set(phases.map((p) => p.id)).size).toBe(phases.length);
    expect(flagIds.size).toBe(flags.length);
  });

  it('only references flags that exist', () => {
    for (const p of phases) {
      for (const id of p.flags) expect(flagIds, `phase ${p.id}`).toContain(id);
      for (const s of p.steps) for (const id of condFlags(s.when)) expect(flagIds, `step ${s.id}`).toContain(id);
    }
    for (const f of flags) for (const id of condFlags(f.showWhen)) expect(flagIds, `flag ${f.id}`).toContain(id);
  });

  it('uses character flags only on per-character steps', () => {
    const charFlags = new Set(flags.filter((f) => f.scope === 'character').map((f) => f.id));
    for (const s of phases.flatMap((p) => p.steps)) {
      if (!s.perCharacter) for (const id of condFlags(s.when)) expect(charFlags.has(id), `step ${s.id}`).toBe(false);
    }
  });

  it('never leaves a phase with zero visible steps, whatever its toggles', () => {
    for (const p of phases) {
      const ids = [...new Set([...p.flags, ...p.steps.flatMap((s) => condFlags(s.when))])];
      for (let mask = 0; mask < 1 << ids.length; mask++) {
        const get = (id: string) => (mask & (1 << ids.indexOf(id))) !== 0;
        const visible = p.steps.filter((s) => evalCondition(s.when, get));
        expect(visible.length, `${p.id} with mask ${mask}`).toBeGreaterThan(0);
      }
    }
  });

  it('keeps reminders short', () => {
    for (const s of phases.flatMap((p) => p.steps)) expect(s.reminder.length, s.id).toBeLessThan(320);
  });
});
