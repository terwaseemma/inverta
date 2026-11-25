'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { saveLeadNotesAction, type NotesFormState } from '../actions';

export function NotesForm({
  leadId,
  initialNotes,
}: {
  leadId: string;
  initialNotes: string;
}) {
  const [rawState, formAction] = useFormState(saveLeadNotesAction, {} as NotesFormState);
  const state = rawState ?? ({} as NotesFormState);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="id" value={leadId} />
      <textarea
        name="notes"
        defaultValue={initialNotes}
        rows={4}
        placeholder="Site visit scheduled, roof type, access notes…"
        aria-label="Notes"
        className="input min-h-[120px] leading-relaxed"
      />
      <div className="flex items-center gap-3">
        <SaveButton />
        {state.success && <span className="text-[13px] text-success">Saved</span>}
        {state.error && <span className="text-[13px] text-destructive">{state.error}</span>}
      </div>
    </form>
  );
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn btn-secondary btn-sm"
    >
      {pending ? 'Saving…' : 'Save notes'}
    </button>
  );
}
