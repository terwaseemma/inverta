'use server';

import { redirect } from 'next/navigation';
import { schemas } from '@inverta/shared';
import { prisma } from '@/lib/prisma';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export interface LoginFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

export async function loginAction(
  _prev: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const parsed = schemas.loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? '');
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors };
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error || !data.user) {
    return { error: error?.message ?? 'Invalid email or password.' };
  }

  // Always head to /dashboard after login. If onboarding is incomplete, the
  // dashboard guard (requireOnboardedInstaller) will bounce them back to
  // /onboarding — one code path for that redirect, no duplication here.
  const next = formData.get('next');
  if (typeof next === 'string' && next.startsWith('/')) {
    redirect(next);
  }
  redirect('/dashboard');
}
