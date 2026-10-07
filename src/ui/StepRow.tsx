import { useState } from 'preact/hooks';
import type { StepInstance } from '../logic/checklist';
import { buzz } from './util';

interface Props {
  instance: StepInstance;
  checked: boolean;
  note: string;
  onToggle: () => void;
  onNote: (text: string) => void;
}

export function StepRow({ instance, checked, note, onToggle, onNote }: Props) {
  const { step } = instance;
  const [open, setOpen] = useState(false);
  const detailsId = `d-${instance.key}`;
  return (
    <li class={`step${checked ? ' is-checked' : ''}`}>
      <div class="step-main">
        <label class="step-check">
          <input
            type="checkbox"
            checked={checked}
            onChange={() => {
              buzz();
              onToggle();
            }}
          />
          <span class="box" aria-hidden="true" />
          <span class="step-title">
            {step.title}
            {step.optional && <span class="pill">optional</span>}
          </span>
        </label>
        <button
          type="button"
          class={`info-btn${note ? ' has-note' : ''}${open ? ' is-open' : ''}`}
          aria-expanded={open}
          aria-controls={detailsId}
          aria-label={open ? 'Hide reminder' : 'Show reminder'}
          onClick={() => setOpen(!open)}
        >
          i
        </button>
      </div>
      {open && (
        <div class="step-details" id={detailsId}>
          <p class="reminder">{step.reminder}</p>
          <label class="note">
            <span>House notes</span>
            <textarea
              rows={2}
              placeholder="Our own reminder for this step…"
              value={note}
              onInput={(e) => onNote(e.currentTarget.value)}
            />
          </label>
        </div>
      )}
    </li>
  );
}
