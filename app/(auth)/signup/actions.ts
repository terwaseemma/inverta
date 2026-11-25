'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { captureServer } from '@/lib/analytics-server';
import { schemas, slugify } from '@inverta/shared';
import { prisma } from '@/lib/prisma';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export interface SignupFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

export async function signupAction(
  _prev: SignupFormState,
  formData: FormData,
): Promise<SignupFormState> {
  const parsed = schemas.signupSchema.safeParse({
    businessName: formData.get('businessName'),
    businessType: formData.get('businessType'),
    contactName: formData.get('contactName'),
    email: formData.get('email'),
    phone: formData.get('phone'),
    password: formData.get('password'),
    region: formData.get('region'),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? '');
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { error: 'Please fix the highlighted fields.', fieldErrors };
  }
  const data = parsed.data;

  // Reject if email is already used (Supabase will also enforce this, but we
  // catch it early for a friendlier message and to avoid orphaned auth users).
  const existing = await prisma.installer.findFirst({
    where: { email: data.email.toLowerCase() },
    select: { id: true },
  });
  if (existing) {
    return {
      fieldErrors: { email: 'An account with this email already exists.' },
    };
  }

  // Someone invited onto a team must join through their invite link. Signing
  // up here would make them the owner of a new, empty installer account and
  // strand the invite — the email can only hold one login.
  const invited = await prisma.member.findFirst({
    where: { email: data.email.toLowerCase() },
    select: { installer: { select: { businessName: true } } },
  });
  if (invited) {
    return {
      fieldErrors: {
        email: `This email has been invited to join ${invited.installer.businessName}. Use the invite link in your email instead.`,
      },
    };
  }

  const supabase = createSupabaseServerClient();
  const origin = headers().get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? '';

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=/onboarding`,
      // display_name / full_name are the keys the Supabase dashboard reads
      // for its "Display name" column; the rest make the user record
      // self-describing in the auth admin UI. The Installer table remains
      // the app's source of truth.
      data: {
        display_name: data.contactName,
        full_name: data.contactName,
        phone: data.phone,
        business_name: data.businessName,
      },
    },
  });

  if (authError || !authData.user) {
    return { error: authError?.message ?? 'Could not create account. Please try again.' };
  }

  // Reserve a unique slug — append -2, -3, … if needed.
  const baseSlug = slugify(data.businessName) || 'installer';
  let slug = baseSlug;
  for (let i = 2; i < 100; i++) {
    const taken = await prisma.installer.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!taken) break;
    slug = `${baseSlug}-${i}`;
  }

  const installer = await prisma.installer.create({
    data: {
      authUserId: authData.user.id,
      businessName: data.businessName,
      businessType: data.businessType,
      slug,
      contactName: data.contactName,
      email: data.email.toLowerCase(),
      phone: data.phone,
      region: data.region,
      calculatorLink: { create: { slug } },
      // The account holder's own seat. Identity resolves through Member.
      members: {
        create: {
          authUserId: authData.user.id,
          email: data.email.toLowerCase(),
          name: data.contactName,
          phone: data.phone,
          role: 'OWNER',
          acceptedAt: new Date(),
        },
      },
    },
  });

  await captureServer('installer_signed_up', installer.id, {
    business_type: data.businessType,
    region: data.region,
    needs_email_confirmation: !authData.session,
  });

  // If Supabase email confirmation is disabled, signUp returns a session
  // immediately — skip the "check your email" step and go straight to
  // onboarding. If confirmation is enabled, there's no session yet; show the
  // verify-email notice and let the callback resume the flow.
  if (authData.session) {
    redirect('/onboarding');
  }
  redirect('/verify-email');
}
