'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { resetPasswordAction, type ResetPasswordState } from './actions';

const initial: ResetPasswordState = {};

export function ResetPasswordForm() {
  const [rawState, formAction] = useFormState(resetPasswordAction, initial);
  const state = rawState ?? initial;

  return (
    <form action={formAction} className="space-y-4">
      <label className="block space-y-1.5">
        <span className="text-sm font-medium">New password</span>
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          className="input"
        />
      </label>
      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Confirm new password</span>
        <input
          name="confirm"
          type="password"
          autoComplete="new-password"
          className="input"
        />
      </label>
      {state.error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-[15px] text-destructive">
          {state.error}
        </div>
      )}
      <Submit />
    </form>
  );
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn btn-primary w-full"
    >
      {pending ? 'Saving…' : 'Set new password'}
    </button>
  );
}
