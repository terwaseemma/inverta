'use server';

import { redirect } from 'next/navigation';
import { schemas } from '@inverta/shared';
import { prisma } from '@/lib/prisma';
import { requireInstaller } from '@/lib/auth';

export interface OnboardingFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

export async function saveOnboardingStep1(
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
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? '');
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors };
  }

  await prisma.installer.update({
    where: { id: installer.id },
    data: {
      logoUrl: parsed.data.logoUrl ?? null,
      websiteUrl: parsed.data.websiteUrl ?? null,
      address: parsed.data.address ?? null,
      bio: parsed.data.bio ?? null,
      // Mark onboarded once step 1 lands. Steps 2 & 3 (catalog, calculator
      // link) are non-blocking — they can be completed from /dashboard.
      onboardedAt: new Date(),
    },
  });

  redirect('/dashboard');
}
