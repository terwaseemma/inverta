'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { schemas, nairaToKobo, slugify } from '@inverta/shared';
import { prisma } from '@/lib/prisma';
import { requireInstaller } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export interface SettingsFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: boolean;
}

function fieldErrorsFrom(issues: { path: (string | number)[]; message: string }[]) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? '');
    if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return fieldErrors;
}

function num(v: FormDataEntryValue | null): number | undefined {
  if (typeof v !== 'string' || v.trim() === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

export async function saveProfileAction(
  _prev: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const { installer } = await requireInstaller();

  const parsed = schemas.settingsProfileSchema.safeParse({
    businessName: formData.get('businessName'),
    contactName: formData.get('contactName'),
    phone: formData.get('phone'),
    region: formData.get('region'),
    logoUrl: formData.get('logoUrl') ?? '',
    websiteUrl: formData.get('websiteUrl') ?? '',
    address: formData.get('address') ?? '',
    bio: formData.get('bio') ?? '',
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  const d = parsed.data;

  await prisma.installer.update({
    where: { id: installer.id },
    data: {
      businessName: d.businessName,
      contactName: d.contactName,
      phone: d.phone,
      region: d.region,
      logoUrl: d.logoUrl ?? null,
      websiteUrl: d.websiteUrl ?? null,
      address: d.address ?? null,
      bio: d.bio ?? null,
    },
  });

  revalidatePath('/dashboard/settings');
  revalidatePath('/dashboard');
  return { success: true };
}

export async function savePricingAction(
  _prev: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const { installer } = await requireInstaller();

  const parsed = schemas.settingsPricingSchema.safeParse({
    feeMode: formData.get('feeMode'),
    installationFeeNaira: num(formData.get('installationFeeNaira')),
    installationFeePercent: num(formData.get('installationFeePercent')),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  const d = parsed.data;

  await prisma.installer.update({
    where: { id: installer.id },
    data: {
      installationFeeKobo:
        d.feeMode === 'flat' ? nairaToKobo(d.installationFeeNaira ?? 0) : 0,
      installationFeePercent:
        d.feeMode === 'percent' ? Math.round(d.installationFeePercent ?? 0) : null,
    },
  });

  revalidatePath('/dashboard/settings');
  return { success: true };
}

export async function savePaymentAction(
  _prev: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const { installer } = await requireInstaller();

  const parsed = schemas.settingsPaymentSchema.safeParse({
    bankName: formData.get('bankName') ?? '',
    bankAccountNumber: formData.get('bankAccountNumber') ?? '',
    bankAccountName: formData.get('bankAccountName') ?? '',
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  const d = parsed.data;

  await prisma.installer.update({
    where: { id: installer.id },
    data: {
      bankName: d.bankName ?? null,
      bankAccountNumber: d.bankAccountNumber ?? null,
      bankAccountName: d.bankAccountName ?? null,
    },
  });

  revalidatePath('/dashboard/settings');
  return { success: true };
}

export async function saveCalculatorLinkAction(
  _prev: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const { installer } = await requireInstaller();

  const parsed = schemas.calculatorLinkSchema.safeParse({
    slug: slugify(String(formData.get('slug') ?? '')),
    isActive: formData.get('isActive') === 'on',
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  const { slug, isActive } = parsed.data;

  // Slug doubles as the installer's public handle (calculator + storefront) —
  // check uniqueness across both tables before applying to either.
  const [linkTaken, installerTaken] = await Promise.all([
    prisma.calculatorLink.findFirst({
      where: { slug, NOT: { installerId: installer.id } },
      select: { id: true },
    }),
    prisma.installer.findFirst({
      where: { slug, NOT: { id: installer.id } },
      select: { id: true },
    }),
  ]);
  if (linkTaken || installerTaken) {
    return { fieldErrors: { slug: 'That link is already taken — try another.' } };
  }

  await prisma.$transaction([
    prisma.installer.update({
      where: { id: installer.id },
      data: { slug },
    }),
    prisma.calculatorLink.upsert({
      where: { installerId: installer.id },
      create: { installerId: installer.id, slug, isActive },
      update: { slug, isActive },
    }),
  ]);

  revalidatePath('/dashboard/settings');
  revalidatePath('/dashboard');
  return { success: true };
}

// Permanently deletes the account: tenant data first (cascade wipes catalog,
// leads, proposals, products, notifications), then the Supabase login, then
// the session. Requires the user to have typed DELETE in the confirm field.
export async function deleteAccountAction(
  _prev: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const { installer, authUserId } = await requireInstaller();

  if (String(formData.get('confirm') ?? '').trim() !== 'DELETE') {
    return { fieldErrors: { confirm: 'Type DELETE (in capitals) to confirm.' } };
  }

  // Collect the team's logins before the cascade removes their Member rows —
  // afterwards there is no record of which Supabase users belonged here.
  const teamLogins = await prisma.member.findMany({
    where: { installerId: installer.id, authUserId: { not: null } },
    select: { authUserId: true },
  });

  await prisma.installer.delete({ where: { id: installer.id } });

  // Owner first, then every marketer. A marketer login left behind would be
  // signed in to an account that no longer exists.
  const logins = new Set<string>([authUserId]);
  for (const m of teamLogins) if (m.authUserId) logins.add(m.authUserId);

  for (const id of logins) {
    try {
      // Created inside the try, as before: a missing service key must not
      // throw after the tenant data is already gone.
      const admin = createSupabaseAdminClient();
      await admin.auth.admin.deleteUser(id);
    } catch (err) {
      // The tenant data is gone either way; a stranded login can't reach any
      // data and can be removed from the Supabase dashboard.
      console.error('[settings] auth user deletion failed:', id, err);
    }
  }

  const supabase = createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect('/');
}
