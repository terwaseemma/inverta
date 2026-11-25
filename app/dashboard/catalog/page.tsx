import { stripWholesaleNote } from '@inverta/shared';
import { requireOnboardedInstaller } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { CatalogManager, type CatalogItemDto } from './catalog-manager';
import { PlatformCatalog, type ImportableItemDto } from './platform-catalog';

export const metadata = { title: 'Catalog · Inverta' };

export default async function CatalogPage() {
  const { installer } = await requireOnboardedInstaller();

  const rows = await prisma.catalogItem.findMany({
    where: { installerId: installer.id },
    orderBy: [{ type: 'asc' }, { capacity: 'asc' }],
  });

  // Decimal → number so the payload is serializable for the client component.
  const items: CatalogItemDto[] = rows.map((r) => ({
    id: r.id,
    type: r.type,
    brand: r.brand,
    model: r.model,
    capacity: Number(r.capacity),
    unit: r.unit,
    voltage: r.voltage,
    systemVoltage: r.systemVoltage,
    maxPvW: r.maxPvW,
    maxPvVoc: r.maxPvVoc,
    mpptCount: r.mpptCount,
    maxPvCurrentA: r.maxPvCurrentA == null ? null : Number(r.maxPvCurrentA),
    storageKwh: r.storageKwh == null ? null : Number(r.storageKwh),
    chemistry: r.chemistry,
    priceKobo: r.priceKobo,
    notes: r.notes,
    imageUrl: r.imageUrl,
  }));

  // Platform products the installer hasn't imported yet (matched on
  // type + brand + model).
  const owned = new Set(items.map((i) => `${i.type}|${i.brand}|${i.model}`));
  const masterRows = await prisma.masterCatalogItem.findMany({
    where: { isActive: true },
    orderBy: [{ type: 'asc' }, { capacity: 'asc' }],
  });
  const importable: ImportableItemDto[] = masterRows
    .filter((m) => !owned.has(`${m.type}|${m.brand}|${m.model}`))
    .map((m) => ({
      id: m.id,
      type: m.type,
      brand: m.brand,
      model: m.model,
      priceKobo: m.priceKobo,
      // The section header already says these are wholesale; repeating it on
      // every row would drown out notes that say something product-specific.
      note: stripWholesaleNote(m.notes),
      imageUrl: m.imageUrl,
    }));

  return (
    <div className="mx-auto w-full max-w-[1040px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mb-6 lg:mb-8">
        <h1 className="page-title">Catalog</h1>
        <p className="page-lead">
          The products your calculator quotes from. Customers only see prices once
          you stock at least one inverter, battery, and panel.
        </p>
      </div>
      <CatalogManager items={items} />

      <PlatformCatalog items={importable} />
    </div>
  );
}
