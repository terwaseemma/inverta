'use server';

import { revalidatePath } from 'next/cache';
import { schemas, nairaToKobo } from '@inverta/shared';
import { prisma } from '@/lib/prisma';
import { requireInstaller } from '@/lib/auth';

export interface ProductFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: boolean;
}

function num(v: FormDataEntryValue | null): number | undefined {
  if (typeof v !== 'string' || v.trim() === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

export async function saveProductAction(
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const { installer } = await requireInstaller();

  const parsed = schemas.productSchema.safeParse({
    type: formData.get('type'),
    name: formData.get('name'),
    description: formData.get('description') ?? '',
    priceNaira: num(formData.get('priceNaira')),
    imageUrl: formData.get('imageUrl') ?? '',
    isAvailable: formData.get('isAvailable') === 'on',
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? '');
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors };
  }
  const d = parsed.data;

  const data = {
    type: d.type,
    name: d.name,
    description: d.description ?? null,
    priceKobo: nairaToKobo(d.priceNaira),
    imageUrl: d.imageUrl ?? null,
    isAvailable: d.isAvailable,
  };

  const id = formData.get('id');
  if (typeof id === 'string' && id) {
    const { count } = await prisma.product.updateMany({
      where: { id, installerId: installer.id },
      data,
    });
    if (count === 0) return { error: 'Product not found.' };
  } else {
    await prisma.product.create({ data: { ...data, installerId: installer.id } });
  }

  revalidatePath('/dashboard/store');
  return { success: true };
}

export async function deleteProductAction(formData: FormData): Promise<void> {
  const { installer } = await requireInstaller();
  const id = String(formData.get('id') ?? '');
  if (!id) return;

  await prisma.product.deleteMany({ where: { id, installerId: installer.id } });
  revalidatePath('/dashboard/store');
}
