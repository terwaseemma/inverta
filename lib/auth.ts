import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import type { Installer, Member } from '@inverta/db';

// Identity resolves through Member: a Supabase login maps to exactly one
// Member, which carries the installer account and a role.
//
//   OWNER    — the account holder. Everything under /dashboard.
//   MARKETER — brings in leads through their own link. Only /team.
//
// The access model is DEFAULT-DENY. Every pre-existing page and action calls
// requireInstaller() or requireOnboardedInstaller(), and both admit owners
// only. A marketer reaching any of them is sent to /team. So catalog prices,
// settings, proposals and the store are closed to marketers without touching
// those pages, and anything a marketer may see has to be built on purpose
// under /team behind requireMarketer().

export interface SessionContext {
  authUserId: string;
  email: string;
  installer: Installer | null;
  /**
   * Null only for a login that predates the Member table and could not be
   * given its OWNER row — treated as an owner, which is what it always was.
   */
  member: Member | null;
}

/** Resolve the Supabase user, their seat, and the account it belongs to. */
export async function getCurrentInstaller(): Promise<SessionContext | null> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const base = { authUserId: user.id, email: user.email ?? '' };

  const seat = await prisma.member.findUnique({
    where: { authUserId: user.id },
    include: { installer: true },
  });
  if (seat) {
    const { installer, ...member } = seat;
    return { ...base, installer, member };
  }

  // Fallback for logins that predate Member. The migration backfills an OWNER
  // row for every existing installer; this covers anyone created in the gap
  // between applying it and deploying code that writes the row at signup.
  // It heals the account on first visit so the fallback empties out.
  const installer = await prisma.installer.findUnique({
    where: { authUserId: user.id },
  });
  if (!installer) return { ...base, installer: null, member: null };

  try {
    const member = await prisma.member.upsert({
      where: { authUserId: user.id },
      update: {},
      create: {
        installerId: installer.id,
        authUserId: user.id,
        email: installer.email,
        name: installer.contactName,
        phone: installer.phone,
        role: 'OWNER',
        acceptedAt: new Date(),
      },
    });
    return { ...base, installer, member };
  } catch {
    // Healing is best-effort; the login still owns this installer.
    return { ...base, installer, member: null };
  }
}

function isMarketer(ctx: SessionContext): boolean {
  return ctx.member?.role === 'MARKETER';
}

// A seat that has been switched off, or a login with no account behind it.
// Both go to a page that offers sign-out, because sending a signed-in user to
// /login or /signup bounces off the middleware back to /dashboard — a loop.
function isLockedOut(ctx: SessionContext): boolean {
  return (ctx.member != null && !ctx.member.isActive) || ctx.installer == null;
}

// OWNER ONLY. Use in server components and actions for protected pages.
// Redirects when:
// - signed out → /login
// - a marketer → /team (default-deny, see above)
// - seat switched off, or no account → /no-access
// - onboarding incomplete → /onboarding
export async function requireOnboardedInstaller(): Promise<{
  authUserId: string;
  email: string;
  installer: Installer;
  member: Member | null;
}> {
  const ctx = await requireInstaller();
  if (!ctx.installer.onboardedAt) redirect('/onboarding');
  return ctx;
}

// OWNER ONLY, onboarding may still be incomplete — for /onboarding itself.
export async function requireInstaller(): Promise<{
  authUserId: string;
  email: string;
  installer: Installer;
  member: Member | null;
}> {
  const ctx = await getCurrentInstaller();
  if (!ctx) redirect('/login');
  if (isLockedOut(ctx)) redirect('/no-access');
  if (isMarketer(ctx)) redirect('/team');
  return { ...ctx, installer: ctx.installer! };
}

// MARKETER ONLY — the /team area. Owners are sent to their own dashboard.
export async function requireMarketer(): Promise<{
  authUserId: string;
  email: string;
  installer: Installer;
  member: Member;
}> {
  const ctx = await getCurrentInstaller();
  if (!ctx) redirect('/login');
  if (isLockedOut(ctx)) redirect('/no-access');
  if (!isMarketer(ctx)) redirect('/dashboard');
  return { ...ctx, installer: ctx.installer!, member: ctx.member! };
}

// Superadmin gate for /admin — non-admins are quietly sent to their own
// dashboard rather than shown a forbidden page. Admin is a property of the
// installer account, and requireInstaller has already excluded marketers.
export async function requireAdmin(): Promise<{
  authUserId: string;
  email: string;
  installer: Installer;
  member: Member | null;
}> {
  const ctx = await requireInstaller();
  if (ctx.installer.role !== 'ADMIN') redirect('/dashboard');
  return ctx;
}
