import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ShoppingBag } from 'lucide-react';
import { formatKobo } from '@inverta/shared';
import { prisma } from '@/lib/prisma';
import { Wordmark } from '@/components/brand/Wordmark';

export const dynamic = 'force-dynamic';

const TYPE_LABELS: Record<string, string> = {
  GENERATOR: 'Solar generator',
  KIT: 'Package',
  PART: 'Component',
};

export default async function StorefrontPage({
  params,
}: {
  params: { slug: string };
}) {
  const installer = await prisma.installer.findUnique({
    where: { slug: params.slug },
    select: {
      id: true,
      businessName: true,
      logoUrl: true,
      bio: true,
      phone: true,
      email: true,
      calculatorLink: { select: { slug: true, isActive: true } },
    },
  });
  if (!installer) notFound();

  const products = await prisma.product.findMany({
    where: { installerId: installer.id, isAvailable: true },
    orderBy: { createdAt: 'desc' },
  });

  const whatsapp = installer.phone.replace(/[^0-9]/g, '');

  return (
    <main className="min-h-screen hero-gradient">
      <header className="border-b border-border/40 bg-background/40 backdrop-blur">
        <div className="container flex h-16 items-center gap-3">
          {installer.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={installer.logoUrl}
              alt={installer.businessName}
              className="h-9 w-9 rounded object-contain"
            />
          ) : (
            <div className="grid h-9 w-9 place-items-center rounded bg-primary text-sm font-semibold text-primary-foreground">
              {installer.businessName[0]}
            </div>
          )}
          <div className="flex-1">
            <div className="text-sm font-medium">{installer.businessName}</div>
            <div className="text-xs text-muted-foreground">Store</div>
          </div>
          <Link
            href="/"
            className="hidden items-center gap-2 text-xs text-muted-foreground hover:text-foreground sm:inline-flex"
          >
            Powered by <Wordmark size="sm" />
          </Link>
        </div>
      </header>

      <div className="container max-w-4xl py-10">
        {installer.bio && (
          <p className="mb-8 max-w-xl text-sm text-muted-foreground">{installer.bio}</p>
        )}

        {products.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-card/40 p-10 text-center">
            <ShoppingBag className="mx-auto h-10 w-10 text-muted-foreground" />
            <h2 className="mt-4 text-lg font-semibold">Nothing listed yet</h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
              {installer.businessName} hasn&apos;t added products to their store.
              {installer.calculatorLink?.isActive && ' Try their solar calculator instead:'}
            </p>
            {installer.calculatorLink?.isActive && (
              <Link
                href={`/calc/${installer.calculatorLink.slug}`}
                className="signup-gradient-hover glass-button mt-5 inline-flex h-10 items-center rounded-md px-5 text-sm font-medium text-foreground transition-all duration-200"
              >
                Size my solar system
              </Link>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => (
              <div
                key={p.id}
                className="flex flex-col overflow-hidden rounded-xl border bg-card/80 backdrop-blur"
              >
                {p.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.imageUrl} alt={p.name} className="h-40 w-full object-cover" />
                ) : (
                  <div className="grid h-40 w-full place-items-center bg-secondary/40">
                    <ShoppingBag className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <div className="flex flex-1 flex-col p-4">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {TYPE_LABELS[p.type] ?? p.type}
                  </div>
                  <h3 className="mt-1 font-semibold">{p.name}</h3>
                  {p.description && (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {p.description}
                    </p>
                  )}
                  <div className="mt-auto flex items-center justify-between pt-4">
                    <span className="font-mono font-semibold orange-text">
                      {formatKobo(p.priceKobo)}
                    </span>
                    <a
                      href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(
                        `Hi, I'm interested in the ${p.name} listed on your Inverta store.`,
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="signup-gradient-hover glass-button inline-flex h-9 items-center rounded-md px-3 text-xs font-medium text-foreground transition-all duration-200"
                    >
                      Enquire
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-10 rounded-xl border bg-card/60 p-5 text-sm backdrop-blur">
          <div className="font-medium">Contact {installer.businessName}</div>
          <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-muted-foreground">
            <a href={`tel:${installer.phone}`} className="hover:text-foreground">
              📞 {installer.phone}
            </a>
            <a href={`mailto:${installer.email}`} className="hover:text-foreground">
              ✉️ {installer.email}
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
