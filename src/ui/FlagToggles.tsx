import type { FlagDef } from '../data/types';

interface Props {
  flags: FlagDef[];
  value: (flagId: string) => boolean;
  onChange: (flag: FlagDef, value: boolean) => void;
  inline?: boolean;
}

export function FlagToggles({ flags, value, onChange, inline }: Props) {
  if (flags.length === 0) return null;
  return (
    <div class={`toggles${inline ? ' is-inline' : ''}`}>
      {flags.map((f) =>
        f.choices ? (
          <div class="toggle" key={f.id} role="radiogroup" aria-label={f.label}>
            <span class="toggle-label">{f.label}</span>
            <span class="segmented">
              {f.choices.map((label, i) => {
                const on = i === 1;
                return (
                  <button type="button" key={label} role="radio" aria-checked={value(f.id) === on} onClick={() => onChange(f, on)}>
                    {label}
                  </button>
                );
              })}
            </span>
          </div>
        ) : (
          <label class="toggle" key={f.id}>
            <span class="toggle-label">
              {f.label}
              {f.scope === 'campaign' && <span class="pill" title="Carries over to future Outpost Phases">kept</span>}
            </span>
            <input type="checkbox" role="switch" checked={value(f.id)} onChange={(e) => onChange(f, e.currentTarget.checked)} />
            <span class="switch" aria-hidden="true" />
          </label>
        ),
      )}
    </div>
  );
}
