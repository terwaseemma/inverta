import 'server-only';

import { prisma } from '@/lib/prisma';
import {
  applyMargin,
  STARTER_CATALOG,
  stripWholesaleNote,
  type AccessoryRule,
  type ImportMargin,
  type RoofType,
} from '@inverta/shared';
import { copyAccessoryRule } from '@/lib/accessory-fields';

// The platform catalog is the admin-managed source installers copy from.
// Until admins publish anything, the built-in starter template acts as the
// fallback so onboarding never dead-ends.

export interface MasterItemData {
  type: 'INVERTER' | 'BATTERY' | 'PANEL' | 'GENERATOR' | 'ACCESSORY';
  brand: string;
  model: string;
  capacity: number;
  unit: 'KVA' | 'KWH' | 'AH' | 'W' | 'UNIT';
  voltage: number | null;
  systemVoltage: number | null;
  storageKwh: number | null;
  chemistry: 'LITHIUM' | 'AGM' | 'GEL' | null;
  priceKobo: number;
  notes: string | null;
  imageUrl: string | null;
  maxPvW: number | null;
  maxPvVoc: number | null;
  mpptCount: number | null;
  maxPvCurrentA: number | null;
  qtyRule: AccessoryRule;
  qtyPer: number;
  minKva: number | null;
  maxKva: number | null;
  roofTypes: RoofType[];
  itemized: boolean;
}

export async function getActiveMasterItems(): Promise<MasterItemData[]> {
  const rows = await prisma.masterCatalogItem.findMany({
    where: { isActive: true },
    orderBy: [{ type: 'asc' }, { capacity: 'asc' }],
  });

  if (rows.length > 0) {
    return rows.map((r) => ({
      type: r.type,
      brand: r.brand,
      model: r.model,
      capacity: Number(r.capacity),
      unit: r.unit,
      voltage: r.voltage,
      systemVoltage: r.systemVoltage,
      storageKwh: r.storageKwh == null ? null : Number(r.storageKwh),
      chemistry: r.chemistry,
      priceKobo: r.priceKobo,
      notes: r.notes,
      imageUrl: r.imageUrl,
      maxPvW: r.maxPvW,
      maxPvVoc: r.maxPvVoc,
      mpptCount: r.mpptCount,
      maxPvCurrentA: r.maxPvCurrentA == null ? null : Number(r.maxPvCurrentA),
      ...copyAccessoryRule(r),
    }));
  }

  return STARTER_CATALOG.map((s) => ({
    type: s.type,
    brand: s.brand,
    model: s.model,
    capacity: s.capacity,
    unit: s.unit,
    voltage: s.voltage ?? null,
    systemVoltage: s.systemVoltage ?? null,
    storageKwh: s.storageKwh ?? null,
    chemistry: s.chemistry ?? null,
    priceKobo: s.priceKobo,
    notes: s.notes ?? null,
    imageUrl: null,
    maxPvW: null,
    maxPvVoc: null,
    mpptCount: null,
    maxPvCurrentA: null,
    qtyRule: s.qtyRule ?? 'PER_INSTALL',
    qtyPer: s.qtyPer ?? 1,
    minKva: s.minKva ?? null,
    maxKva: s.maxKva ?? null,
    roofTypes: [...(s.roofTypes ?? [])],
    itemized: s.itemized ?? true,
  }));
}

/**
 * Copy master items into an installer's catalog.
 *
 * The wholesale marker is stripped here rather than at each call site, so the
 * bulk paths (onboarding, "load starter catalog") cannot leak it into an
 * installer's own stock the way the single-item import once did.
 *
 * Prices are trade cost plus `margin`, asked for wherever the starter catalog
 * is loaded (onboarding, empty catalog), the same rule as the single-item
 * import. The engine applies no uplift of its own, so without a margin a
 * catalog seeded this way would quote at cost.
 */
export async function copyItemsToInstaller(
  installerId: string,
  items: MasterItemData[],
  margin?: ImportMargin,
): Promise<number> {
  if (items.length === 0) return 0;
  const { count } = await prisma.catalogItem.createMany({
    data: items.map((item) => ({
      installerId,
      type: item.type,
      brand: item.brand,
      model: item.model,
      capacity: item.capacity,
      unit: item.unit,
      voltage: item.voltage,
      systemVoltage: item.systemVoltage,
      storageKwh: item.storageKwh,
      chemistry: item.chemistry,
      priceKobo: margin ? applyMargin(item.priceKobo, margin) : item.priceKobo,
      notes: stripWholesaleNote(item.notes),
      imageUrl: item.imageUrl,
      maxPvW: item.maxPvW,
      maxPvVoc: item.maxPvVoc,
      mpptCount: item.mpptCount,
      maxPvCurrentA: item.maxPvCurrentA,
      ...copyAccessoryRule(item),
    })),
  });
  return count;
}
