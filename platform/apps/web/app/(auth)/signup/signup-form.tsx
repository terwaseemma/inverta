'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { NIGERIAN_STATES } from '@inverta/shared';
import { signupAction, type SignupFormState } from './actions';
import { cn } from '@/lib/utils';

const initialState: SignupFormState = {};

export function SignupForm() {
  const [state, formAction] = useFormState(signupAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <Field
        label="Business name"
        name="businessName"
        error={state.fieldErrors?.businessName}
      />
      <Field
        label="Business type"
        name="businessType"
        error={state.fieldErrors?.businessType}
        as="select"
        defaultValue="INSTALLER"
        options={[
          { value: 'INSTALLER', label: 'Installer' },
          { value: 'VENDOR', label: 'Vendor' },
          { value: 'BOTH', label: 'Both' },
        ]}
      />
      <Field
        label="Contact person"
        name="contactName"
        error={state.fieldErrors?.contactName}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Email"
          name="email"
          type="email"
          error={state.fieldErrors?.email}
        />
        <Field
          label="WhatsApp number"
          name="phone"
          type="tel"
          placeholder="+234…"
          error={state.fieldErrors?.phone}
        />
      </div>
      <Field
        label="Password"
        name="password"
        type="password"
        error={state.fieldErrors?.password}
      />
      <Field
        label="State / region"
        name="region"
        as="select"
        defaultValue=""
        error={state.fieldErrors?.region}
        options={[
          { value: '', label: 'Select your state…', disabled: true },
          ...NIGERIAN_STATES.map((s) => ({ value: s, label: s })),
        ]}
      />

      {state.error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {state.error}
        </div>
      )}

      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="signup-gradient-hover glass-button inline-flex h-11 w-full items-center justify-center rounded-md px-5 text-sm font-medium text-foreground transition-all duration-200 disabled:opacity-60"
    >
      {pending ? 'Creating account…' : 'Create account'}
    </button>
  );
}

function Field({
  label,
  name,
  type = 'text',
  placeholder,
  error,
  as = 'input',
  options,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  error?: string;
  as?: 'input' | 'select';
  options?: { value: string; label: string; disabled?: boolean }[];
  defaultValue?: string;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      {as === 'select' ? (
        <select
          name={name}
          defaultValue={defaultValue}
          className={cn('input', error && 'border-destructive')}
        >
          {options?.map((o) => (
            <option key={o.value} value={o.value} disabled={o.disabled}>
              {o.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          name={name}
          type={type}
          placeholder={placeholder}
          defaultValue={defaultValue}
          className={cn('input', error && 'border-destructive')}
        />
      )}
      {error && <span className="text-xs text-destructive">{error}</span>}
    </label>
  );
}
