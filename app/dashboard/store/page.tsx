import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { requireOnboardedInstaller } from '@/lib/auth';
import { PageHeader, PageShell } from '@/components/app/page';
import { prisma } from '@/lib/prisma';
import { StoreManager, type ProductDto } from './store-manager';

export const metadata = { title: 'Store · Inverta' };

export default async function StorePage() {
  const { installer } = await requireOnboardedInstaller();

  const rows = await prisma.product.findMany({
    where: { installerId: installer.id },
    orderBy: { createdAt: 'desc' },
  });

  const products: ProductDto[] = rows.map((r) => ({
    id: r.id,
    type: r.type,
    name: r.name,
    description: r.description,
    priceKobo: r.priceKobo,
    imageUrl: r.imageUrl,
    isAvailable: r.isAvailable,
  }));

  return (
    <PageShell>
      <PageHeader
        title="Store"
        lead="Products listed on your public storefront, where customers enquire on WhatsApp."
        actions={
          <Link href={`/store/${installer.slug}`} target="_blank" className="btn btn-secondary">
            View storefront <ArrowUpRight className="h-4 w-4" />
          </Link>
        }
      />
      <StoreManager products={products} />
    </PageShell>
  );
}
