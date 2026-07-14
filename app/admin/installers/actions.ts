'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';

// Kill switch: deactivating a calculator link 404s the installer's public
// calculator without touching any of their data.
export async function toggleInstallerCalculatorAction(
  formData: FormData,
): Promise<void> {
  await requireAdmin();
  const installerId = String(formData.get('installerId') ?? '');
  if (!installerId) return;

  const link = await prisma.calculatorLink.findUnique({ where: { installerId } });
  if (!link) return;

  await prisma.calculatorLink.update({
    where: { installerId },
    data: { isActive: !link.isActive },
  });

  revalidatePath('/admin/installers');
}
