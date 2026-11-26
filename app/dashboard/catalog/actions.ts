'use server';

import { revalidatePath } from 'next/cache';
import {
  schemas,
  applyMargin,
  matchPriceList,
  nairaToKobo,
  previewAdjustment,
  readPriceList,
  stripWholesaleNote,
} from '@inverta/shared';
import { MAX_PRICE_LIST_CHARS, plural, readAdjustment, readMargin, scopeWhere, type PriceToolState } from '@/lib/catalog-pricing';
import { prisma } from '@/lib/prisma';
import { accessoryColumns, copyAccessoryRule, readAccessoryFields } from '@/lib/accessory-fields';
import { requireInstaller } from '@/lib/auth';
import { copyItemsToInstaller, getActiveMasterItems } from '@/lib/master-catalog';
import { captureServer } from '@/lib/analytics-server';

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
    systemVoltage: num(formData.get('systemVoltage')),
    maxPvW: num(formData.get('maxPvW')),
    maxPvVoc: num(formData.get('maxPvVoc')),
    mpptCount: num(formData.get('mpptCount')),
    maxPvCurrentA: num(formData.get('maxPvCurrentA')),
    storageKwh: num(formData.get('storageKwh')),
    chemistry: str(formData.get('chemistry')),
    priceNaira: num(formData.get('priceNaira')),
    notes: str(formData.get('notes')),
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

  await captureServer('catalog_item_saved', installer.id, {
    action: id ? 'updated' : 'added',
    type: d.type.toLowerCase(),
    has_image: Boolean(d.imageUrl),
    brand: d.brand,
  });
  revalidatePath('/dashboard/catalog');
  revalidatePath('/dashboard');
  return { success: true };
}

export async function deleteCatalogItemAction(formData: FormData): Promise<void> {
  const { installer } = await requireInstaller();
  const id = str(formData.get('id'));
  if (!id) return;

  // deleteMany so a forged id belonging to another tenant silently no-ops.
  const { count } = await prisma.catalogItem.deleteMany({
    where: { id, installerId: installer.id },
  });
  if (count > 0) await captureServer('catalog_item_deleted', installer.id);

  revalidatePath('/dashboard/catalog');
  revalidatePath('/dashboard');
}

export async function loadStarterCatalogAction(
  _prev: CatalogFormState,
  formData: FormData,
): Promise<CatalogFormState> {
  const { installer } = await requireInstaller();
  const read = readMargin(formData);
  if ('error' in read) return { fieldErrors: { margin: read.error } };

  const existing = await prisma.catalogItem.count({
    where: { installerId: installer.id },
  });
  if (existing > 0) {
    return { error: 'Your catalog already has items — the starter set is only for empty catalogs.' };
  }

  // Admin-curated platform catalog, or the built-in template until one exists.
  const items = await getActiveMasterItems();
  await copyItemsToInstaller(installer.id, items, read.margin);
  await captureServer('starter_catalog_loaded', installer.id, {
    where: 'catalog',
    items: items.length,
    margin_mode: read.margin.marginMode,
    margin_percent: read.margin.marginPercent ?? null,
  });

  revalidatePath('/dashboard/catalog');
  revalidatePath('/dashboard');
  return { success: true };
}

// Copy a single platform product into the installer's catalog, at the trade
// price plus the margin they entered. Platform prices are wholesale and the
// engine applies no uplift of its own, so whatever lands here is exactly what
// the customer will be quoted.
export async function importMasterItemAction(
  _prev: CatalogFormState,
  formData: FormData,
): Promise<CatalogFormState> {
  const { installer } = await requireInstaller();
  const id = String(formData.get('id') ?? '');
  if (!id) return { error: 'No product selected.' };

  const parsed = schemas.importMarginSchema.safeParse({
    marginMode: formData.get('marginMode'),
    marginPercent: num(formData.get('marginPercent')),
    marginNaira: num(formData.get('marginNaira')),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? '');
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors };
  }

  const master = await prisma.masterCatalogItem.findFirst({
    where: { id, isActive: true },
  });
  if (!master) return { error: 'That product is no longer in the platform catalog.' };

  const duplicate = await prisma.catalogItem.findFirst({
    where: {
      installerId: installer.id,
      type: master.type,
      brand: master.brand,
      model: master.model,
    },
    select: { id: true },
  });
  if (duplicate) return { error: 'You have already imported that product.' };

  await prisma.catalogItem.create({
    data: {
      installerId: installer.id,
      type: master.type,
      brand: master.brand,
      model: master.model,
      capacity: master.capacity,
      unit: master.unit,
      voltage: master.voltage,
      systemVoltage: master.systemVoltage,
      maxPvW: master.maxPvW,
      maxPvVoc: master.maxPvVoc,
      mpptCount: master.mpptCount,
      maxPvCurrentA: master.maxPvCurrentA,
      storageKwh: master.storageKwh,
      chemistry: master.chemistry,
      priceKobo: applyMargin(master.priceKobo, parsed.data),
      // The wholesale marker describes the platform listing, not their stock.
      notes: stripWholesaleNote(master.notes),
      imageUrl: master.imageUrl,
      ...copyAccessoryRule(master),
    },
  });

  await captureServer('platform_product_imported', installer.id, {
    type: master.type.toLowerCase(),
    brand: master.brand,
    margin_mode: parsed.data.marginMode,
    margin_percent: parsed.data.marginMode === 'percent' ? parsed.data.marginPercent : null,
  });
  revalidatePath('/dashboard/catalog');
  revalidatePath('/dashboard');
  return { success: true };
}

// ── Bulk price tools ──────────────────────────────────────────────────────

/** Raise or lower many prices at once (by %, or naira per product). */
export async function bulkAdjustPricesAction(
  _prev: PriceToolState,
  formData: FormData,
): Promise<PriceToolState> {
  const { installer } = await requireInstaller();
  const read = readAdjustment(formData);
  if ('error' in read) return { error: read.error };

  // Fetched within this installer's catalog, so the updates below can only
  // ever touch their own rows.
  const items = await prisma.catalogItem.findMany({
    where: { installerId: installer.id, ...scopeWhere(read.scopeType, read.scopeBrand) },
    select: { id: true, brand: true, model: true, priceKobo: true },
  });
  const changes = previewAdjustment(items, read.adjustment);
  if (changes.length === 0) return { message: 'No prices changed.' };

  await prisma.$transaction(
    changes.map((c) => prisma.catalogItem.update({ where: { id: c.id }, data: { priceKobo: c.newKobo } })),
  );
  await captureServer('catalog_prices_adjusted', installer.id, {
    count: changes.length,
    direction: read.adjustment.direction,
    mode: read.adjustment.mode,
    value: read.adjustment.value,
    scope_type: read.scopeType.toLowerCase(),
    scoped_brand: read.scopeBrand !== 'ALL',
  });
  revalidatePath('/dashboard/catalog');
  revalidatePath('/dashboard');
  return { success: true, message: `Updated ${plural(changes.length, 'price')}.` };
}

/** Apply an uploaded CSV price list, matching rows to products by brand and model. */
export async function importPriceListAction(
  _prev: PriceToolState,
  formData: FormData,
): Promise<PriceToolState> {
  const { installer } = await requireInstaller();
  const csv = String(formData.get('csv') ?? '');
  if (!csv.trim()) return { error: 'Choose a CSV file first.' };
  if (csv.length > MAX_PRICE_LIST_CHARS) return { error: 'That file is too large for a price list.' };

  const { rows, problems } = readPriceList(csv);
  if (rows.length === 0) return { error: problems[0]?.message ?? 'No prices found in the file.' };

  const items = await prisma.catalogItem.findMany({
    where: { installerId: installer.id },
    select: { id: true, brand: true, model: true, priceKobo: true },
  });
  const { changes, unmatched } = matchPriceList(rows, items);
  if (changes.length > 0) {
    await prisma.$transaction(
      changes.map((c) => prisma.catalogItem.update({ where: { id: c.id }, data: { priceKobo: c.newKobo } })),
    );
  }
  await captureServer('price_list_imported', installer.id, {
    rows: rows.length,
    updated: changes.length,
    unmatched: unmatched.length,
  });
  revalidatePath('/dashboard/catalog');
  revalidatePath('/dashboard');
  const skipped = unmatched.length ? ` ${plural(unmatched.length, 'row')} didn't match a product.` : '';
  return {
    success: changes.length > 0,
    message: changes.length ? `Updated ${plural(changes.length, 'price')}.${skipped}` : `No prices changed.${skipped}`,
  };
}
