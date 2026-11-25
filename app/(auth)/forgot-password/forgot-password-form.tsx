'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { MailCheck } from 'lucide-react';
import {
  requestPasswordResetAction,
  type ForgotPasswordState,
} from './actions';

const initial: ForgotPasswordState = {};

export function ForgotPasswordForm() {
  const [rawState, formAction] = useFormState(requestPasswordResetAction, initial);
  const state = rawState ?? initial;

  if (state.sent) {
    return (
      <div className="rounded-xl p-4 text-center bg-secondary">
        <MailCheck className="mx-auto h-8 w-8 text-link" />
        <p className="mt-3 text-sm">
          If that email has an account, a reset link is on its way. Check your inbox
          (and spam folder).
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Email</span>
        <input name="email" type="email" autoComplete="email" className="input" />
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
      {pending ? 'Sending…' : 'Send reset link'}
    </button>
  );
}
