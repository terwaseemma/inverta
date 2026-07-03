'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { Sparkles } from 'lucide-react';
import { slugify } from '@inverta/shared';
import { LogoUploader } from '@/components/onboarding/LogoUploader';
import { cn } from '@/lib/utils';
import {
  finishOnboardingAction,
  saveProfileStepAction,
  savePaymentStepAction,
  type OnboardingFormState,
} from './actions';

const initial: OnboardingFormState = {};

export function ProfileStepForm({
  defaults,
}: {
  defaults: { logoUrl: string; websiteUrl: string; address: string; bio: string };
}) {
  const [rawState, formAction] = useFormState(saveProfileStepAction, initial);
  const state = rawState ?? initial;
  const err = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-4">
      <LogoUploader initialUrl={defaults.logoUrl} />
      <Field
        label="Website (optional)"
        name="websiteUrl"
        defaultValue={defaults.websiteUrl}
        placeholder="https://your-site.com"
        error={err.websiteUrl}
      />
      <Field
        label="Business address"
        name="address"
        defaultValue={defaults.address}
        error={err.address}
      />
      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Tagline / short bio</span>
        <textarea
          name="bio"
          defaultValue={defaults.bio}
          rows={3}
          className={cn('input min-h-[80px] py-2', err.bio && 'border-destructive')}
          placeholder="One sentence customers will see on your calculator."
        />
        {err.bio && <span className="text-xs text-destructive">{err.bio}</span>}
      </label>

      {state.error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {state.error}
        </div>
      )}

      <WizardFooter continueLabel="Save & continue" skipHref="/onboarding?step=2" />
    </form>
  );
}

export function PaymentStepForm({
  defaults,
}: {
  defaults: { bankName: string; bankAccountNumber: string; bankAccountName: string };
}) {
  const [rawState, formAction] = useFormState(savePaymentStepAction, initial);
  const state = rawState ?? initial;
  const err = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-4">
      <Field
        label="Bank"
        name="bankName"
        defaultValue={defaults.bankName}
        placeholder="e.g. Moniepoint MFB"
        error={err.bankName}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Account number"
          name="bankAccountNumber"
          defaultValue={defaults.bankAccountNumber}
          placeholder="e.g. 9037945493"
          error={err.bankAccountNumber}
        />
        <Field
          label="Account name"
          name="bankAccountName"
          defaultValue={defaults.bankAccountName}
          placeholder="e.g. Your Business Ltd"
          error={err.bankAccountName}
        />
      </div>

      {state.error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {state.error}
        </div>
      )}

      <WizardFooter continueLabel="Save & continue" skipHref="/onboarding?step=4" />
    </form>
  );
}

export function FinishForm({
  defaultSlug,
  appUrl,
}: {
  defaultSlug: string;
  appUrl: string;
}) {
  const [rawState, formAction] = useFormState(finishOnboardingAction, initial);
  const state = rawState ?? initial;
  const [slug, setSlug] = useState(defaultSlug);
  const err = state.fieldErrors ?? {};
  const preview = slugify(slug) || '…';

  return (
    <form action={formAction} className="space-y-4">
      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Your link handle</span>
        <input
          name="slug"
          value={slug}
          onChange={(e) => setSlug(e.target.value.toLowerCase())}
          className={cn('input font-mono', err.slug && 'border-destructive')}
        />
        {err.slug && <span className="text-xs text-destructive">{err.slug}</span>}
      </label>

      <div className="rounded-md border border-primary/30 bg-primary/5 p-4">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">
          Your calculator will live at
        </div>
        <div className="mt-1 break-all font-mono text-sm orange-text">
          {appUrl}/calc/{preview}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Share this anywhere — WhatsApp status, Instagram bio, flyers. Every
          submission becomes a lead in your dashboard.
        </p>
      </div>

      {state.error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {state.error}
        </div>
      )}

      <FinishButton />
    </form>
  );
}

function WizardFooter({
  continueLabel,
  skipHref,
}: {
  continueLabel: string;
  skipHref: string;
}) {
  return (
    <div className="flex items-center justify-between pt-2">
      <Link
        href={skipHref}
        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        Skip for now
      </Link>
      <ContinueButton label={continueLabel} />
    </div>
  );
}

function ContinueButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="signup-gradient-hover glass-button inline-flex h-11 items-center rounded-md px-6 text-sm font-medium text-foreground transition-all duration-200 disabled:opacity-60"
    >
      {pending ? 'Saving…' : label}
    </button>
  );
}

function FinishButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="signup-gradient-hover glass-button inline-flex h-11 w-full items-center justify-center gap-2 rounded-md text-sm font-medium text-foreground transition-all duration-200 disabled:opacity-60"
    >
      <Sparkles className="h-4 w-4" />
      {pending ? 'Launching…' : 'Launch my calculator'}
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
