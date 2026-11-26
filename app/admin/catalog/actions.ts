'use server';

import { revalidatePath } from 'next/cache';
import {
  schemas,
  matchPriceList,
  nairaToKobo,
  previewAdjustment,
  readPriceList,
  STARTER_ACCESSORIES,
  STARTER_CATALOG,
  WHOLESALE_NOTE,
} from '@inverta/shared';
import { MAX_PRICE_LIST_CHARS, plural, readAdjustment, scopeWhere, type PriceToolState } from '@/lib/catalog-pricing';
import { prisma } from '@/lib/prisma';
import { accessoryColumns, readAccessoryFields } from '@/lib/accessory-fields';
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
    maxPvW: num(formData.get('maxPvW')),
    maxPvVoc: num(formData.get('maxPvVoc')),
    mpptCount: num(formData.get('mpptCount')),
    maxPvCurrentA: num(formData.get('maxPvCurrentA')),
    storageKwh: num(formData.get('storageKwh')),
    chemistry: formData.get('chemistry') || undefined,
    priceNaira: num(formData.get('priceNaira')),
    notes: String(formData.get('notes') ?? '').trim() || undefined,
    imageUrl: String(formData.get('imageUrl') ?? ''),
    ...readAccessoryFields(formData),
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
    maxPvW: d.type === 'INVERTER' || d.type === 'GENERATOR' ? (d.maxPvW ?? null) : null,
    maxPvVoc: d.type === 'INVERTER' || d.type === 'GENERATOR' ? (d.maxPvVoc ?? null) : null,
    mpptCount: d.type === 'INVERTER' || d.type === 'GENERATOR' ? (d.mpptCount ?? null) : null,
    maxPvCurrentA: d.type === 'INVERTER' || d.type === 'GENERATOR' ? (d.maxPvCurrentA ?? null) : null,
    chemistry: d.chemistry ?? null,
    priceKobo: nairaToKobo(d.priceNaira),
    notes: d.notes ?? null,
    imageUrl: d.imageUrl ?? null,
    ...accessoryColumns(d),
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
      ...accessoryColumns({ ...item, roofTypes: item.roofTypes ? [...item.roofTypes] : undefined }),
    })),
  });
  revalidatePath('/admin/catalog');
}

// Add the rule-based starter accessories (mounting by roof, cable by kVA and
// building height, protection) to a platform catalog that has none. They go in
// hidden: the prices are estimates to check before installers can import them.
export async function addStarterAccessoriesAction(): Promise<void> {
  await requireAdmin();
  const existing = await prisma.masterCatalogItem.findMany({
    where: { type: 'ACCESSORY' },
    select: { brand: true, model: true },
  });
  const have = new Set(existing.map((e) => `${e.brand}|${e.model}`));
  const fresh = STARTER_ACCESSORIES.filter((a) => !have.has(`${a.brand}|${a.model}`));
  if (fresh.length === 0) return;
  await prisma.masterCatalogItem.createMany({
    data: fresh.map((item) => ({
      type: item.type,
      brand: item.brand,
      model: item.model,
      capacity: item.capacity,
      unit: item.unit,
      priceKobo: item.priceKobo,
      notes: WHOLESALE_NOTE,
      ...accessoryColumns({ ...item, roofTypes: item.roofTypes ? [...item.roofTypes] : undefined }),
      isActive: false,
    })),
  });
  revalidatePath('/admin/catalog');
}

// ── Bulk price tools (platform catalog) ──────────────────────────────────

export async function bulkAdjustMasterPricesAction(
  _prev: PriceToolState,
  formData: FormData,
): Promise<PriceToolState> {
  await requireAdmin();
  const read = readAdjustment(formData);
  if ('error' in read) return { error: read.error };
  const items = await prisma.masterCatalogItem.findMany({
    where: scopeWhere(read.scopeType, read.scopeBrand),
    select: { id: true, brand: true, model: true, priceKobo: true },
  });
  const changes = previewAdjustment(items, read.adjustment);
  if (changes.length === 0) return { message: 'No prices changed.' };
  await prisma.$transaction(
    changes.map((c) => prisma.masterCatalogItem.update({ where: { id: c.id }, data: { priceKobo: c.newKobo } })),
  );
  revalidatePath('/admin/catalog');
  revalidatePath('/dashboard/catalog');
  return { success: true, message: `Updated ${plural(changes.length, 'price')}.` };
}

export async function importMasterPriceListAction(
  _prev: PriceToolState,
  formData: FormData,
): Promise<PriceToolState> {
  await requireAdmin();
  const csv = String(formData.get('csv') ?? '');
  if (!csv.trim()) return { error: 'Choose a CSV file first.' };
  if (csv.length > MAX_PRICE_LIST_CHARS) return { error: 'That file is too large for a price list.' };
  const { rows, problems } = readPriceList(csv);
  if (rows.length === 0) return { error: problems[0]?.message ?? 'No prices found in the file.' };
  const items = await prisma.masterCatalogItem.findMany({
    select: { id: true, brand: true, model: true, priceKobo: true },
  });
  const { changes, unmatched } = matchPriceList(rows, items);
  if (changes.length > 0) {
    await prisma.$transaction(
      changes.map((c) => prisma.masterCatalogItem.update({ where: { id: c.id }, data: { priceKobo: c.newKobo } })),
    );
  }
  revalidatePath('/admin/catalog');
  revalidatePath('/dashboard/catalog');
  const skipped = unmatched.length ? ` ${plural(unmatched.length, 'row')} didn't match a product.` : '';
  return {
    success: changes.length > 0,
    message: changes.length ? `Updated ${plural(changes.length, 'price')}.${skipped}` : `No prices changed.${skipped}`,
  };
}
