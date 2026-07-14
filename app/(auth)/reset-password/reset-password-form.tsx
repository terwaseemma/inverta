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
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
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
      className="signup-gradient-hover glass-button inline-flex h-11 w-full items-center justify-center rounded-md px-5 text-sm font-medium text-foreground transition-all duration-200 disabled:opacity-60"
    >
      {pending ? 'Saving…' : 'Set new password'}
    </button>
  );
}
