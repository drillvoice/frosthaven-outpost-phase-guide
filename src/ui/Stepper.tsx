export function Stepper({ value, min, max, onChange, label }: { value: number; min: number; max: number; onChange: (n: number) => void; label: string }) {
  const set = (n: number) => onChange(Math.min(max, Math.max(min, Number.isFinite(n) ? Math.round(n) : min)));
  return (
    <span class="stepper">
      <button type="button" class="icon-btn" aria-label={`${label}: fewer`} disabled={value <= min} onClick={() => set(value - 1)}>
        −
      </button>
      <input type="number" inputMode="numeric" aria-label={label} min={min} max={max} value={value} onInput={(e) => set(e.currentTarget.valueAsNumber)} />
      <button type="button" class="icon-btn" aria-label={`${label}: more`} disabled={value >= max} onClick={() => set(value + 1)}>
        +
      </button>
    </span>
  );
}
