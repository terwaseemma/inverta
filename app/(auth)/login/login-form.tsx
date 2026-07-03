'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { loginAction, type LoginFormState } from './actions';
import { cn } from '@/lib/utils';

const initial: LoginFormState = {};

export function LoginForm({ next }: { next?: string }) {
  const [rawState, formAction] = useFormState(loginAction, initial);
  const state = rawState ?? initial;
  return (
    <form action={formAction} className="space-y-4">
      {next && <input type="hidden" name="next" value={next} />}
      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Email</span>
        <input
          name="email"
          type="email"
          className={cn('input', state.fieldErrors?.email && 'border-destructive')}
          autoComplete="email"
        />
        {state.fieldErrors?.email && (
          <span className="text-xs text-destructive">{state.fieldErrors.email}</span>
        )}
      </label>
      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Password</span>
        <input
          name="password"
          type="password"
          className={cn('input', state.fieldErrors?.password && 'border-destructive')}
          autoComplete="current-password"
        />
        {state.fieldErrors?.password && (
          <span className="text-xs text-destructive">{state.fieldErrors.password}</span>
        )}
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
      {pending ? 'Signing in…' : 'Sign in'}
    </button>
  );
}
