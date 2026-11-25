'use client';

import Link from 'next/link';
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
          <span className="text-[13px] text-destructive">{state.fieldErrors.email}</span>
        )}
      </label>
      <label className="block space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Password</span>
          <Link
            href="/forgot-password"
            className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
          >
            Forgot password?
          </Link>
        </div>
        <input
          name="password"
          type="password"
          className={cn('input', state.fieldErrors?.password && 'border-destructive')}
          autoComplete="current-password"
        />
        {state.fieldErrors?.password && (
          <span className="text-[13px] text-destructive">{state.fieldErrors.password}</span>
        )}
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
      {pending ? 'Signing in…' : 'Sign in'}
    </button>
  );
}
