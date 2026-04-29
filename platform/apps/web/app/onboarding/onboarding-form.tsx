'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { saveOnboardingStep1, type OnboardingFormState } from './actions';
import { cn } from '@/lib/utils';

const initial: OnboardingFormState = {};

export function OnboardingForm({
  defaults,
}: {
  defaults: { logoUrl: string; websiteUrl: string; address: string; bio: string };
}) {
  const [state, formAction] = useFormState(saveOnboardingStep1, initial);

  return (
    <form action={formAction} className="space-y-4">
      <Field
        label="Logo URL"
        name="logoUrl"
        defaultValue={defaults.logoUrl}
        placeholder="https://… (paste a hosted image URL — uploads coming soon)"
        error={state.fieldErrors?.logoUrl}
      />
      <Field
        label="Website (optional)"
        name="websiteUrl"
        defaultValue={defaults.websiteUrl}
        placeholder="https://your-site.com"
        error={state.fieldErrors?.websiteUrl}
      />
      <Field
        label="Business address"
        name="address"
        defaultValue={defaults.address}
        error={state.fieldErrors?.address}
      />
      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Tagline / short bio</span>
        <textarea
          name="bio"
          defaultValue={defaults.bio}
          rows={3}
          className={cn(
            'input min-h-[80px] py-2',
            state.fieldErrors?.bio && 'border-destructive',
          )}
          placeholder="One sentence customers will see on your calculator."
        />
        {state.fieldErrors?.bio && (
          <span className="text-xs text-destructive">{state.fieldErrors.bio}</span>
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
      {pending ? 'Saving…' : 'Save and continue'}
    </button>
  );
}

function Field({
  label,
  name,
  defaultValue,
  placeholder,
  error,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  error?: string;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      <input
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className={cn('input', error && 'border-destructive')}
      />
      {error && <span className="text-xs text-destructive">{error}</span>}
    </label>
  );
}
