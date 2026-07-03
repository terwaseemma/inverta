import { requireOnboardedInstaller } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { CatalogManager, type CatalogItemDto } from './catalog-manager';

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
    storageKwh: r.storageKwh == null ? null : Number(r.storageKwh),
    chemistry: r.chemistry,
    priceKobo: r.priceKobo,
    notes: r.notes,
  }));

  return (
    <div className="container max-w-4xl py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Catalog</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          The products your calculator quotes from. Customers only see prices once
          you stock at least one inverter, battery, and panel.
        </p>
      </div>
      <CatalogManager items={items} />
    </div>
  );
}
