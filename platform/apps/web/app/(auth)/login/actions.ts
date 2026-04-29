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

  // Send unfinished onboardees to /onboarding, everyone else to /dashboard.
  const installer = await prisma.installer.findUnique({
    where: { authUserId: data.user.id },
    select: { onboardedAt: true },
  });

  const next = formData.get('next');
  if (typeof next === 'string' && next.startsWith('/')) {
    redirect(next);
  }
  redirect(installer?.onboardedAt ? '/dashboard' : '/onboarding');
}
