import { useEffect, useRef, useState } from 'preact/hooks';

interface Props {
  complete: boolean;
  onCancel: () => void;
  onConfirm: (note: string) => void;
}

export function NewPhaseDialog({ complete, onCancel, onConfirm }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [note, setNote] = useState('');
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog ref={ref} class="dialog" onCancel={onCancel} onClose={onCancel}>
      <form
        method="dialog"
        onSubmit={(e) => {
          e.preventDefault();
          onConfirm(note);
        }}
      >
        <h2>Start new Outpost Phase?</h2>
        <p>
          {complete
            ? 'This one is logged as complete.'
            : 'Not every step is ticked. This one will be logged as unfinished.'}{' '}
          Ticks and this week's toggles reset; party, house notes and "kept" toggles stay.
        </p>
        <label class="note">
          <span>Note for the log (optional)</span>
          <textarea rows={3} value={note} onInput={(e) => setNote(e.currentTarget.value)} placeholder="e.g. Scenario 12 won, built the Garden" />
        </label>
        <div class="dialog-actions">
          <button type="button" class="btn" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" class="btn btn-primary">
            Start new phase
          </button>
        </div>
      </form>
    </dialog>
  );
}
