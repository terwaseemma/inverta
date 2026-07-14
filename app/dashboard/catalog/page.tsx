import { Download, PackageSearch } from 'lucide-react';
import { formatKobo } from '@inverta/shared';
import { requireOnboardedInstaller } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { CatalogManager, type CatalogItemDto } from './catalog-manager';
import { importMasterItemAction } from './actions';

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

  // Platform products the installer hasn't imported yet (matched on
  // type + brand + model).
  const owned = new Set(items.map((i) => `${i.type}|${i.brand}|${i.model}`));
  const masterRows = await prisma.masterCatalogItem.findMany({
    where: { isActive: true },
    orderBy: [{ type: 'asc' }, { capacity: 'asc' }],
  });
  const importable = masterRows.filter(
    (m) => !owned.has(`${m.type}|${m.brand}|${m.model}`),
  );

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

      {importable.length > 0 && (
        <section className="mt-8 rounded-xl border bg-card/80 backdrop-blur">
          <div className="flex items-center gap-2 border-b px-5 py-3">
            <PackageSearch className="h-4 w-4 text-primary" />
            <h2 className="font-semibold">Platform catalog</h2>
            <span className="text-xs text-muted-foreground">
              curated products you can resell — imported items get the suggested
              price, which you can edit after
            </span>
          </div>
          <div className="divide-y">
            {importable.map((m) => (
              <div key={m.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <div className="min-w-[180px] flex-1">
                  <div className="text-sm font-medium">
                    {m.brand} {m.model}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {m.type.charAt(0) + m.type.slice(1).toLowerCase()}
                    {m.notes ? ` · ${m.notes}` : ''}
                  </div>
                </div>
                <div className="font-mono text-sm">{formatKobo(m.priceKobo)}</div>
                <form action={importMasterItemAction}>
                  <input type="hidden" name="id" value={m.id} />
                  <button
                    type="submit"
                    className="inline-flex h-8 items-center gap-1.5 rounded-md border bg-background/40 px-3 text-xs font-medium backdrop-blur transition-colors hover:bg-secondary"
                  >
                    <Download className="h-3 w-3" /> Import
                  </button>
                </form>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
