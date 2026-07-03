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
        className="input min-h-[100px] py-2"
      />
      <div className="flex items-center gap-3">
        <SaveButton />
        {state.success && <span className="text-xs text-primary">Saved ✓</span>}
        {state.error && <span className="text-xs text-destructive">{state.error}</span>}
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
      className="inline-flex h-9 items-center rounded-md border bg-background/40 px-4 text-sm font-medium backdrop-blur transition-colors hover:bg-secondary disabled:opacity-50"
    >
      {pending ? 'Saving…' : 'Save notes'}
    </button>
  );
}
