'use server';

import { headers } from 'next/headers';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export interface ForgotPasswordState {
  error?: string;
  sent?: boolean;
}

export async function requestPasswordResetAction(
  _prev: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const parsed = z.string().email().safeParse(formData.get('email'));
  if (!parsed.success) return { error: 'Enter a valid email address.' };

  const origin = headers().get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? '';
  const supabase = createSupabaseServerClient();

  // The recovery link lands on /auth/callback, which exchanges the code for
  // a session and forwards to /reset-password.
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });

  // Always report success — never reveal whether an email is registered.
  // Genuine failures (rate limits, SMTP issues) land in the server log.
  if (error) console.error('[auth] resetPasswordForEmail:', error.message);
  return { sent: true };
}
