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
      <div className="rounded-md border border-primary/30 bg-primary/5 p-4 text-center">
        <MailCheck className="mx-auto h-8 w-8 text-primary" />
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
      {pending ? 'Sending…' : 'Send reset link'}
    </button>
  );
}
