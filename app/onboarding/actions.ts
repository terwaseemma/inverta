'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { schemas, slugify, STARTER_CATALOG } from '@inverta/shared';
import { prisma } from '@/lib/prisma';
import { requireInstaller } from '@/lib/auth';
import { sendWelcomeEmail } from '@/lib/notifications';

export interface OnboardingFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

function fieldErrorsFrom(issues: { path: (string | number)[]; message: string }[]) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? '');
    if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return fieldErrors;
}

// Step 1 — business profile. Saving advances to step 2; every field is
// individually optional so "just continue" also works.
export async function saveProfileStepAction(
  _prev: OnboardingFormState,
  formData: FormData,
): Promise<OnboardingFormState> {
  const { installer } = await requireInstaller();

  const parsed = schemas.onboardingStep1Schema.safeParse({
    logoUrl: formData.get('logoUrl') ?? '',
    websiteUrl: formData.get('websiteUrl') ?? '',
    address: formData.get('address') ?? '',
    bio: formData.get('bio') ?? '',
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };

  await prisma.installer.update({
    where: { id: installer.id },
    data: {
      logoUrl: parsed.data.logoUrl ?? null,
      websiteUrl: parsed.data.websiteUrl ?? null,
      address: parsed.data.address ?? null,
      bio: parsed.data.bio ?? null,
    },
  });

  redirect('/onboarding?step=2');
}

// Step 2 — catalog quick-start. Loads the starter template then advances.
// (Skipping is just a link to ?step=3 — no action needed.)
export async function loadStarterCatalogStepAction(): Promise<void> {
  const { installer } = await requireInstaller();

  const existing = await prisma.catalogItem.count({
    where: { installerId: installer.id },
  });
  if (existing === 0) {
    await prisma.catalogItem.createMany({
      data: STARTER_CATALOG.map((item) => ({
        installerId: installer.id,
        type: item.type,
        brand: item.brand,
        model: item.model,
        capacity: item.capacity,
        unit: item.unit,
        voltage: item.voltage ?? null,
        storageKwh: item.storageKwh ?? null,
        chemistry: item.chemistry ?? null,
        priceKobo: item.priceKobo,
        notes: item.notes ?? null,
      })),
    });
    revalidatePath('/dashboard/catalog');
  }

  redirect('/onboarding?step=3');
}

// Step 3 — payment details for proposals. Skippable.
export async function savePaymentStepAction(
  _prev: OnboardingFormState,
  formData: FormData,
): Promise<OnboardingFormState> {
  const { installer } = await requireInstaller();

  const parsed = schemas.settingsPaymentSchema.safeParse({
    bankName: formData.get('bankName') ?? '',
    bankAccountNumber: formData.get('bankAccountNumber') ?? '',
    bankAccountName: formData.get('bankAccountName') ?? '',
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };

  await prisma.installer.update({
    where: { id: installer.id },
    data: {
      bankName: parsed.data.bankName ?? null,
      bankAccountNumber: parsed.data.bankAccountNumber ?? null,
      bankAccountName: parsed.data.bankAccountName ?? null,
    },
  });

  redirect('/onboarding?step=4');
}

// Step 4 — confirm the calculator link and finish. Sets onboardedAt, which
// unlocks the dashboard.
export async function finishOnboardingAction(
  _prev: OnboardingFormState,
  formData: FormData,
): Promise<OnboardingFormState> {
  const { installer } = await requireInstaller();

  const slug = slugify(String(formData.get('slug') ?? ''));
  const parsed = schemas.calculatorLinkSchema.safeParse({ slug, isActive: true });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };

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
      data: { slug, onboardedAt: new Date() },
    }),
    prisma.calculatorLink.upsert({
      where: { installerId: installer.id },
      create: { installerId: installer.id, slug, isActive: true },
      update: { slug, isActive: true },
    }),
  ]);

  // Welcome email with their live calculator link — never blocks the finish.
  try {
    await sendWelcomeEmail({
      email: installer.email,
      contactName: installer.contactName,
      businessName: installer.businessName,
      calcSlug: slug,
    });
  } catch {
    // non-fatal
  }

  redirect('/dashboard');
}
