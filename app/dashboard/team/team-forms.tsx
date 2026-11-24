'use client';

import { useEffect, useRef } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { MessageCircle, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { whatsappHref } from '@/lib/whatsapp';
import { CopyLink } from '../copy-button';
import { inviteMemberAction, type TeamFormState } from './actions';

const initial: TeamFormState = {};

export function InviteForm({ businessName }: { businessName: string }) {
  const [rawState, formAction] = useFormState(inviteMemberAction, initial);
  const state = rawState ?? initial;
  const err = state.fieldErrors ?? {};
  const formRef = useRef<HTMLFormElement>(null);

  // Clear the fields after a successful invite so the next one starts fresh.
  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success, state.inviteUrl]);

  return (
    <div className="space-y-4">
      <form ref={formRef} action={formAction} className="grid gap-4 sm:grid-cols-3">
        <Field label="Name" name="name" placeholder="Amaka Okafor" error={err.name} />
        <Field
          label="Email"
          name="email"
          type="email"
          placeholder="amaka@example.com"
          error={err.email}
        />
        <Field label="Phone (optional)" name="phone" placeholder="+234…" error={err.phone} />
        <div className="flex items-center gap-3 sm:col-span-3">
          <InviteButton />
          {state.error && <span className="text-xs text-destructive">{state.error}</span>}
        </div>
      </form>

      {state.success && state.inviteUrl && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm">
          <p className="font-medium">
            {state.invitedName} is invited.
          </p>
          <p className="mt-1 text-muted-foreground">
            We emailed them the link if email is set up. Send it yourself as well —
            it&apos;s how most invites actually arrive.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded bg-background/60 px-2 py-1 font-mono text-xs">
              {state.inviteUrl}
            </code>
            <CopyLink url={state.inviteUrl} />
            <a
              href={whatsappHref(
                `Hi ${state.invitedName?.split(' ')[0] ?? ''}, join the ${businessName} sales team on Inverta and get your own solar quote link: ${state.inviteUrl}`,
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border bg-background px-2.5 py-1 text-xs font-medium hover:bg-muted"
            >
              <MessageCircle className="h-3 w-3" /> WhatsApp
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function InviteButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="signup-gradient-hover glass-button inline-flex h-10 items-center gap-2 rounded-md px-5 text-sm font-medium text-foreground transition-all duration-200 disabled:opacity-60"
    >
      <UserPlus className="h-4 w-4" />
      {pending ? 'Inviting…' : 'Send invite'}
    </button>
  );
}

function Field({
  label,
  name,
  type = 'text',
  placeholder,
  error,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  error?: string;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        className={cn('input', error && 'border-destructive')}
      />
      {error && <span className="text-xs text-destructive">{error}</span>}
    </label>
  );
}
