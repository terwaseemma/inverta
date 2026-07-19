'use server';

import { revalidatePath } from 'next/cache';
import { schemas, nairaToKobo, STARTER_CATALOG } from '@inverta/shared';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';

export interface AdminCatalogFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: boolean;
}

function num(v: FormDataEntryValue | null): number | undefined {
  if (typeof v !== 'string' || v.trim() === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

export async function saveMasterItemAction(
  _prev: AdminCatalogFormState,
  formData: FormData,
): Promise<AdminCatalogFormState> {
  await requireAdmin();

  const parsed = schemas.catalogItemSchema.safeParse({
    type: formData.get('type'),
    brand: formData.get('brand'),
    model: formData.get('model'),
    capacity: num(formData.get('capacity')),
    unit: formData.get('unit'),
    voltage: num(formData.get('voltage')),
    systemVoltage: num(formData.get('systemVoltage')),
    storageKwh: num(formData.get('storageKwh')),
    chemistry: formData.get('chemistry') || undefined,
    priceNaira: num(formData.get('priceNaira')),
    notes: String(formData.get('notes') ?? '').trim() || undefined,
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
    systemVoltage: d.type === 'INVERTER' || d.type === 'BATTERY' ? (d.systemVoltage ?? null) : null,
    storageKwh: d.type === 'GENERATOR' ? (d.storageKwh ?? null) : null,
    chemistry: d.chemistry ?? null,
    priceKobo: nairaToKobo(d.priceNaira),
    notes: d.notes ?? null,
    isActive: formData.get('isActive') === 'on',
  };

  const id = formData.get('id');
  if (typeof id === 'string' && id) {
    await prisma.masterCatalogItem.update({ where: { id }, data });
  } else {
    await prisma.masterCatalogItem.create({ data });
  }

  revalidatePath('/admin/catalog');
  revalidatePath('/dashboard/catalog');
  return { success: true };
}

export async function deleteMasterItemAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  await prisma.masterCatalogItem.deleteMany({ where: { id } });
  revalidatePath('/admin/catalog');
  revalidatePath('/dashboard/catalog');
}

export async function toggleMasterItemAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  const item = await prisma.masterCatalogItem.findUnique({ where: { id } });
  if (!item) return;
  await prisma.masterCatalogItem.update({
    where: { id },
    data: { isActive: !item.isActive },
  });
  revalidatePath('/admin/catalog');
  revalidatePath('/dashboard/catalog');
}

// Bootstrap the platform catalog from the built-in template.
export async function seedMasterCatalogAction(): Promise<void> {
  await requireAdmin();
  const existing = await prisma.masterCatalogItem.count();
  if (existing > 0) return;
  await prisma.masterCatalogItem.createMany({
    data: STARTER_CATALOG.map((item) => ({
      type: item.type,
      brand: item.brand,
      model: item.model,
      capacity: item.capacity,
      unit: item.unit,
      voltage: item.voltage ?? null,
      systemVoltage: item.systemVoltage ?? null,
      storageKwh: item.storageKwh ?? null,
      chemistry: item.chemistry ?? null,
      priceKobo: item.priceKobo,
      notes: item.notes ?? null,
    })),
  });
  revalidatePath('/admin/catalog');
}
