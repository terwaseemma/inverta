import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { AdminCatalogManager, type MasterItemDto } from './admin-catalog-manager';

export const metadata = { title: 'Platform catalog · Inverta Admin' };

export default async function AdminCatalogPage() {
  await requireAdmin();

  const rows = await prisma.masterCatalogItem.findMany({
    orderBy: [{ type: 'asc' }, { capacity: 'asc' }],
  });

  const items: MasterItemDto[] = rows.map((r) => ({
    id: r.id,
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
    isActive: r.isActive,
  }));

  return (
    <div className="mx-auto w-full max-w-[1040px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mb-6 lg:mb-8">
        <h1 className="page-title">Platform catalog</h1>
        <p className="page-lead">
          Products installers can pull into their own catalogs and resell. New
          installers load these during onboarding; existing installers import them
          from their catalog page. Inactive items are hidden from installers.
        </p>
      </div>
      <AdminCatalogManager items={items} />
    </div>
  );
}
