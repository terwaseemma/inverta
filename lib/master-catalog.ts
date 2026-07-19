import 'server-only';

import { prisma } from '@/lib/prisma';
import { STARTER_CATALOG } from '@inverta/shared';

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
  }));
}

/** Copy master items into an installer's catalog. */
export async function copyItemsToInstaller(
  installerId: string,
  items: MasterItemData[],
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
      priceKobo: item.priceKobo,
      notes: item.notes,
    })),
  });
  return count;
}
