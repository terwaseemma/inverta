'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { deleteAccountAction, type SettingsFormState } from './actions';

const initial: SettingsFormState = {};

export function DangerZone({ businessName }: { businessName: string }) {
  const [armed, setArmed] = useState(false);
  const [rawState, formAction] = useFormState(deleteAccountAction, initial);
  const state = rawState ?? initial;

  if (!armed) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          Permanently delete {businessName} — your calculator, catalog, leads, and
          proposals are erased and cannot be recovered.
        </p>
        <button
          type="button"
          onClick={() => setArmed(true)}
          className="btn btn-danger"
        >
          Delete account…
        </button>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
        <div className="text-sm">
          <p className="font-medium text-destructive">This cannot be undone.</p>
          <p className="mt-1 text-muted-foreground">
            Your login, calculator link, catalog, all {businessName} leads, and every
            proposal will be permanently deleted. Customers with proposal links will
            lose access.
          </p>
        </div>
      </div>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium">
          Type <span className="font-mono text-destructive">DELETE</span> to confirm
        </span>
        <input
          name="confirm"
          autoComplete="off"
          className={cn(
            'input max-w-xs font-mono',
            state.fieldErrors?.confirm && 'border-destructive',
          )}
        />
        {state.fieldErrors?.confirm && (
          <span className="text-[13px] text-destructive">{state.fieldErrors.confirm}</span>
        )}
      </label>

      {state.error && (
        <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-[15px] text-destructive">
          {state.error}
        </div>
      )}

      <div className="flex items-center gap-3">
        <DeleteButton />
        <button
          type="button"
          onClick={() => setArmed(false)}
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function DeleteButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn bg-destructive text-destructive-foreground hover:bg-destructive/90"
    >
      {pending ? 'Deleting…' : 'Permanently delete account'}
    </button>
  );
}
