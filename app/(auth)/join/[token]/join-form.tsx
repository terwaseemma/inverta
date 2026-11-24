'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { cn } from '@/lib/utils';
import { acceptInviteAction, type JoinFormState } from './actions';

const initial: JoinFormState = {};

export function JoinForm({ token, email }: { token: string; email: string }) {
  const [rawState, formAction] = useFormState(acceptInviteAction, initial);
  const state = rawState ?? initial;
  const err = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Email</span>
        <input value={email} readOnly className="input opacity-70" />
      </label>
      <PasswordField label="Choose a password" name="password" error={err.password} />
      <PasswordField label="Confirm password" name="confirm" error={err.confirm} />
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <JoinButton />
    </form>
  );
}

function PasswordField({ label, name, error }: { label: string; name: string; error?: string }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      <input
        type="password"
        name={name}
        autoComplete="new-password"
        className={cn('input', error && 'border-destructive')}
      />
      {error && <span className="text-xs text-destructive">{error}</span>}
    </label>
  );
}

function JoinButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="signup-gradient-hover glass-button inline-flex h-10 w-full items-center justify-center rounded-md px-5 text-sm font-medium text-foreground transition-all duration-200 disabled:opacity-60"
    >
      {pending ? 'Joining…' : 'Join the team'}
    </button>
  );
}
