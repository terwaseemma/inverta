'use server';

import { revalidatePath } from 'next/cache';
import { schemas, nairaToKobo, STARTER_CATALOG } from '@inverta/shared';
import { prisma } from '@/lib/prisma';
import { requireInstaller } from '@/lib/auth';

export interface CatalogFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: boolean;
}

function num(v: FormDataEntryValue | null): number | undefined {
  if (typeof v !== 'string' || v.trim() === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function str(v: FormDataEntryValue | null): string | undefined {
  if (typeof v !== 'string' || v.trim() === '') return undefined;
  return v.trim();
}

// Create when no id present, update when it is. One action keeps the form
// component simple and the tenancy check in one place.
export async function saveCatalogItemAction(
  _prev: CatalogFormState,
  formData: FormData,
): Promise<CatalogFormState> {
  const { installer } = await requireInstaller();

  const parsed = schemas.catalogItemSchema.safeParse({
    type: formData.get('type'),
    brand: str(formData.get('brand')),
    model: str(formData.get('model')),
    capacity: num(formData.get('capacity')),
    unit: formData.get('unit'),
    voltage: num(formData.get('voltage')),
    storageKwh: num(formData.get('storageKwh')),
    chemistry: str(formData.get('chemistry')),
    priceNaira: num(formData.get('priceNaira')),
    notes: str(formData.get('notes')),
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
    brand: d.brand,
    model: d.model,
    capacity: d.capacity,
    unit: d.unit,
    voltage: d.voltage ?? null,
    storageKwh: d.type === 'GENERATOR' ? (d.storageKwh ?? null) : null,
    chemistry: d.chemistry ?? null,
    priceKobo: nairaToKobo(d.priceNaira),
    notes: d.notes ?? null,
  };

  const id = str(formData.get('id'));
  if (id) {
    // Tenancy: only rows belonging to this installer can be touched.
    const { count } = await prisma.catalogItem.updateMany({
      where: { id, installerId: installer.id },
      data,
    });
    if (count === 0) return { error: 'Item not found.' };
  } else {
    await prisma.catalogItem.create({
      data: { ...data, installerId: installer.id },
    });
  }

  revalidatePath('/dashboard/catalog');
  revalidatePath('/dashboard');
  return { success: true };
}

export async function deleteCatalogItemAction(formData: FormData): Promise<void> {
  const { installer } = await requireInstaller();
  const id = str(formData.get('id'));
  if (!id) return;

  // deleteMany so a forged id belonging to another tenant silently no-ops.
  await prisma.catalogItem.deleteMany({
    where: { id, installerId: installer.id },
  });

  revalidatePath('/dashboard/catalog');
  revalidatePath('/dashboard');
}

export async function loadStarterCatalogAction(
  _prev: CatalogFormState,
  _formData: FormData,
): Promise<CatalogFormState> {
  const { installer } = await requireInstaller();

  const existing = await prisma.catalogItem.count({
    where: { installerId: installer.id },
  });
  if (existing > 0) {
    return { error: 'Your catalog already has items — the starter set is only for empty catalogs.' };
  }

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
  revalidatePath('/dashboard');
  return { success: true };
}
