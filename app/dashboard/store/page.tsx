import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { requireOnboardedInstaller } from '@/lib/auth';
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
    <div className="container max-w-4xl py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Store</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Products listed on your public storefront.
          </p>
        </div>
        <Link
          href={`/store/${installer.slug}`}
          target="_blank"
          className="inline-flex items-center gap-1.5 text-sm orange-text hover:underline"
        >
          View storefront <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <StoreManager products={products} />
    </div>
  );
}
