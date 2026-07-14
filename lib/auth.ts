import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import type { Installer } from '@inverta/db';

// Resolve the Supabase user AND their Installer row in one helper.
// Returns null if not signed in. Use `requireInstaller()` for protected pages.
export async function getCurrentInstaller(): Promise<{
  authUserId: string;
  email: string;
  installer: Installer | null;
} | null> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const installer = await prisma.installer.findUnique({
    where: { authUserId: user.id },
  });

  return {
    authUserId: user.id,
    email: user.email ?? '',
    installer,
  };
}

// Use in server components for protected pages. Redirects when:
// - signed out → /login
// - signed in but no Installer row → /signup (shouldn't happen but defensive)
// - signed in but onboarding incomplete → /onboarding
export async function requireOnboardedInstaller(): Promise<{
  authUserId: string;
  email: string;
  installer: Installer;
}> {
  const ctx = await getCurrentInstaller();
  if (!ctx) redirect('/login');
  if (!ctx.installer) redirect('/signup');
  if (!ctx.installer.onboardedAt) redirect('/onboarding');
  return { ...ctx, installer: ctx.installer };
}

// Lighter version — auth required, but onboarding may still be incomplete.
// Use on /onboarding pages so they can finish the wizard.
export async function requireInstaller(): Promise<{
  authUserId: string;
  email: string;
  installer: Installer;
}> {
  const ctx = await getCurrentInstaller();
  if (!ctx) redirect('/login');
  if (!ctx.installer) redirect('/signup');
  return { ...ctx, installer: ctx.installer };
}

// Superadmin gate for /admin — non-admins are quietly sent to their own
// dashboard rather than shown a forbidden page.
export async function requireAdmin(): Promise<{
  authUserId: string;
  email: string;
  installer: Installer;
}> {
  const ctx = await requireInstaller();
  if (ctx.installer.role !== 'ADMIN') redirect('/dashboard');
  return ctx;
}
