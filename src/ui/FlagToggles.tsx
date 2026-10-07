import type { FlagDef } from '../data/types';

interface Props {
  flags: FlagDef[];
  value: (flagId: string) => boolean;
  onChange: (flag: FlagDef, value: boolean) => void;
}

export function FlagToggles({ flags, value, onChange }: Props) {
  if (flags.length === 0) return null;
  return (
    <div class="toggles">
      {flags.map((f) => (
        <label class="toggle" key={f.id}>
          <span class="toggle-label">
            {f.label}
            {f.scope === 'campaign' && <span class="pill" title="Carries over to future Outpost Phases">kept</span>}
          </span>
          <input type="checkbox" role="switch" checked={value(f.id)} onChange={(e) => onChange(f, e.currentTarget.checked)} />
          <span class="switch" aria-hidden="true" />
        </label>
      ))}
    </div>
  );
}
