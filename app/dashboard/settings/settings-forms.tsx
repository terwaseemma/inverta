'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { NIGERIAN_STATES } from '@inverta/shared';
import { LogoUploader } from '@/components/onboarding/LogoUploader';
import { cn } from '@/lib/utils';
import {
  saveCalculatorLinkAction,
  savePaymentAction,
  savePricingAction,
  saveProfileAction,
  type SettingsFormState,
} from './actions';

const initial: SettingsFormState = {};

export function ProfileForm({
  defaults,
}: {
  defaults: {
    businessName: string;
    contactName: string;
    phone: string;
    region: string;
    logoUrl: string;
    websiteUrl: string;
    address: string;
    bio: string;
  };
}) {
  const [rawState, formAction] = useFormState(saveProfileAction, initial);
  const state = rawState ?? initial;
  const err = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-4">
      <LogoUploader initialUrl={defaults.logoUrl} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Business name" name="businessName" defaultValue={defaults.businessName} error={err.businessName} />
        <Field label="Contact person" name="contactName" defaultValue={defaults.contactName} error={err.contactName} />
        <Field label="WhatsApp number" name="phone" defaultValue={defaults.phone} error={err.phone} />
        <label className="block space-y-1.5">
          <span className="text-[15px] font-medium">State / region</span>
          <select name="region" defaultValue={defaults.region} className="input">
            {NIGERIAN_STATES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          {err.region && <span className="text-[13px] text-destructive">{err.region}</span>}
        </label>
        <Field label="Website (optional)" name="websiteUrl" defaultValue={defaults.websiteUrl} placeholder="https://…" error={err.websiteUrl} />
        <Field label="Business address" name="address" defaultValue={defaults.address} error={err.address} />
      </div>
      <label className="block space-y-1.5">
        <span className="text-[15px] font-medium">Tagline / short bio</span>
        <textarea name="bio" defaultValue={defaults.bio} rows={2} className="input min-h-[64px] py-2" />
        {err.bio && <span className="text-[13px] text-destructive">{err.bio}</span>}
      </label>
      <FormFooter state={state} label="Save profile" />
    </form>
  );
}

export function PricingForm({
  defaults,
}: {
  defaults: {
    feeMode: 'flat' | 'percent';
    installationFeeNaira: number;
    installationFeePercent: number;
  };
}) {
  const [rawState, formAction] = useFormState(savePricingAction, initial);
  const state = rawState ?? initial;
  const [feeMode, setFeeMode] = useState<'flat' | 'percent'>(defaults.feeMode);
  const err = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="feeMode" value={feeMode} />
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1.5">
          <span className="text-[15px] font-medium">Installation fee type</span>
          <select
            value={feeMode}
            onChange={(e) => setFeeMode(e.target.value as 'flat' | 'percent')}
            className="input"
          >
            <option value="flat">Flat amount (₦)</option>
            <option value="percent">% of system cost</option>
          </select>
        </label>
        {feeMode === 'flat' ? (
          <Field
            label="Installation fee (₦)"
            name="installationFeeNaira"
            type="number"
            defaultValue={String(defaults.installationFeeNaira)}
            error={err.installationFeeNaira}
          />
        ) : (
          <Field
            label="Installation fee (% of system cost)"
            name="installationFeePercent"
            type="number"
            defaultValue={String(defaults.installationFeePercent)}
            error={err.installationFeePercent}
          />
        )}
      </div>
      <FormFooter state={state} label="Save pricing" />
    </form>
  );
}

export function PaymentForm({
  defaults,
}: {
  defaults: { bankName: string; bankAccountNumber: string; bankAccountName: string };
}) {
  const [rawState, formAction] = useFormState(savePaymentAction, initial);
  const state = rawState ?? initial;
  const err = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Bank" name="bankName" defaultValue={defaults.bankName} placeholder="e.g. Moniepoint MFB" error={err.bankName} />
        <Field label="Account number" name="bankAccountNumber" defaultValue={defaults.bankAccountNumber} placeholder="e.g. 9037945493" error={err.bankAccountNumber} />
        <Field className="sm:col-span-2" label="Account name" name="bankAccountName" defaultValue={defaults.bankAccountName} placeholder="e.g. Your Business Ltd" error={err.bankAccountName} />
      </div>
      <FormFooter state={state} label="Save payment details" />
    </form>
  );
}

export function CalculatorLinkForm({
  appUrl,
  defaults,
}: {
  appUrl: string;
  defaults: { slug: string; isActive: boolean };
}) {
  const [rawState, formAction] = useFormState(saveCalculatorLinkAction, initial);
  const state = rawState ?? initial;
  const [slug, setSlug] = useState(defaults.slug);
  const err = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-4">
      <label className="block space-y-1.5">
        <span className="text-[15px] font-medium">Link handle</span>
        <input
          name="slug"
          value={slug}
          onChange={(e) => setSlug(e.target.value.toLowerCase())}
          className={cn('input font-mono', err.slug && 'border-destructive')}
        />
        {err.slug && <span className="text-[13px] text-destructive">{err.slug}</span>}
      </label>
      <div className="break-all rounded-xl bg-secondary px-4 py-3 text-[13px] text-muted-foreground">
        <div>{appUrl}/calc/<span className="text-foreground">{slug || '…'}</span></div>
        <div>{appUrl}/store/<span className="text-foreground">{slug || '…'}</span></div>
      </div>
      <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-secondary p-4 text-[15px]">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={defaults.isActive}
          className="mt-0.5 h-5 w-5 shrink-0 accent-primary"
        />
        <span>
          Calculator is live
          <span className="block text-[13px] text-muted-foreground">
            Off hides it from customers — your marketers&apos; links stop working too.
          </span>
        </span>
      </label>
      <FormFooter state={state} label="Save link" />
    </form>
  );
}

function Field({
  label,
  name,
  type = 'text',
  defaultValue,
  placeholder,
  error,
  className,
}: {
  className?: string;
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  placeholder?: string;
  error?: string;
}) {
  return (
    <label className={cn('block space-y-1.5', className)}>
      <span className="text-[15px] font-medium">{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className={cn('input', error && 'border-destructive')}
      />
      {error && <span className="text-[13px] text-destructive">{error}</span>}
    </label>
  );
}

function FormFooter({ state, label }: { state: SettingsFormState; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <SubmitButton label={label} />
      {state.success && <span className="text-[13px] text-success">Saved</span>}
      {state.error && <span className="text-[13px] text-destructive">{state.error}</span>}
    </div>
  );
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn btn-secondary">
      {pending ? 'Saving…' : label}
    </button>
  );
}
