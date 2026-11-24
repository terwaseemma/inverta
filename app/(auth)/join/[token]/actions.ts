'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { schemas } from '@inverta/shared';
import { prisma } from '@/lib/prisma';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export interface JoinFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

// Turn a pending invite into a login. The email is fixed by the invite — the
// marketer only chooses a password — so an invite cannot be redeemed for a
// different address than the owner typed.
export async function acceptInviteAction(
  _prev: JoinFormState,
  formData: FormData,
): Promise<JoinFormState> {
  const token = String(formData.get('token') ?? '');

  const parsed = schemas.acceptInviteSchema.safeParse({
    password: formData.get('password'),
    confirm: formData.get('confirm'),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? '');
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors };
  }

  const seat = await prisma.member.findUnique({
    where: { inviteToken: token },
    include: { installer: { select: { businessName: true } } },
  });
  if (!seat || seat.authUserId || !seat.isActive) {
    return { error: 'This invite is no longer valid. Ask for a new link.' };
  }

  // Re-check at the last moment: the email may have become an installer
  // account since the invite was sent.
  const conflict = await prisma.installer.findFirst({
    where: { email: seat.email },
    select: { id: true },
  });
  if (conflict) {
    return { error: 'This email already runs an installer account. Ask for an invite to a different email.' };
  }

  const supabase = createSupabaseServerClient();
  const origin = headers().get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? '';

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: seat.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=/team`,
      data: {
        display_name: seat.name,
        full_name: seat.name,
        phone: seat.phone ?? undefined,
        business_name: seat.installer.businessName,
        role: 'marketer',
      },
    },
  });

  if (authError || !authData.user) {
    return { error: authError?.message ?? 'Could not create your login. Please try again.' };
  }

  // With email confirmation on, Supabase answers an already-registered email
  // with an obfuscated user that has no identities instead of an error.
  if ((authData.user.identities ?? []).length === 0) {
    return { error: 'An account with this email already exists. Sign in instead, or ask for an invite to a different email.' };
  }

  // Claim the seat only if it is still pending — two tabs submitting the same
  // invite must not both win.
  const claimed = await prisma.member.updateMany({
    where: { id: seat.id, inviteToken: token, authUserId: null },
    data: { authUserId: authData.user.id, acceptedAt: new Date(), inviteToken: null },
  });
  if (claimed.count === 0) {
    return { error: 'This invite was just used. Try signing in instead.' };
  }

  if (authData.session) redirect('/team');
  redirect('/verify-email?for=team');
}
