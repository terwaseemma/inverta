import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Mail, MessageCircle, Phone, ShoppingBag } from 'lucide-react';
import { formatKobo } from '@inverta/shared';
import { prisma } from '@/lib/prisma';
import { Wordmark } from '@/components/brand/Wordmark';
import { shareMetadata, storeShare } from '@/lib/og/share-copy';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  return shareMetadata(await storeShare(params.slug));
}

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

  const calc = installer.calculatorLink?.isActive ? installer.calculatorLink : null;

  return (
    <main className="min-h-screen">
      <header className="border-b bg-card">
        <div className="mx-auto flex h-16 w-full max-w-[1040px] items-center gap-3 px-4 sm:px-6 lg:px-8">
          {installer.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={installer.logoUrl}
              alt={installer.businessName}
              className="h-10 w-10 rounded-xl border bg-card object-contain p-1"
            />
          ) : (
            <span
              aria-hidden
              className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-base font-semibold text-primary-foreground"
            >
              {installer.businessName.trim()[0]?.toUpperCase()}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate text-[15px] font-semibold">{installer.businessName}</div>
            <div className="text-[13px] text-muted-foreground">Solar store</div>
          </div>
          <Link
            href="/"
            className="hidden items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
          >
            Powered by <Wordmark size="sm" />
          </Link>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1040px] px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-xl">
            <h1 className="page-title">{installer.businessName}</h1>
            <p className="page-lead">
              {installer.bio || 'Solar generators, kits and parts — ask about any of them on WhatsApp.'}
            </p>
          </div>
          {calc && (
            <Link href={`/calc/${calc.slug}`} className="btn btn-primary">
              Get a free solar quote
            </Link>
          )}
        </div>

        {products.length === 0 ? (
          <div className="card flex flex-col items-center px-6 py-14 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-secondary text-muted-foreground">
              <ShoppingBag className="h-6 w-6" />
            </span>
            <h2 className="mt-4 text-[17px] font-semibold">Nothing listed yet</h2>
            <p className="mt-1.5 max-w-sm text-[15px] leading-relaxed text-muted-foreground">
              {installer.businessName} hasn&apos;t added products here yet.
              {calc && ' Their calculator will size a system for you in two minutes.'}
            </p>
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => (
              <li key={p.id} className="card flex flex-col overflow-hidden">
                {p.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.imageUrl} alt={p.name} className="aspect-[4/3] w-full object-cover" />
                ) : (
                  <div className="grid aspect-[4/3] w-full place-items-center bg-secondary">
                    <ShoppingBag className="h-8 w-8 text-muted-foreground" aria-hidden />
                  </div>
                )}
                <div className="flex flex-1 flex-col p-5">
                  <div className="label">{TYPE_LABELS[p.type] ?? p.type}</div>
                  <h2 className="mt-1 text-[17px] font-semibold leading-snug">{p.name}</h2>
                  {p.description && (
                    <p className="mt-1.5 line-clamp-2 text-[15px] leading-relaxed text-muted-foreground">
                      {p.description}
                    </p>
                  )}
                  <div className="mt-auto flex items-center justify-between gap-3 pt-5">
                    <span className="figure text-[20px]">{formatKobo(p.priceKobo)}</span>
                    {whatsapp && (
                      <a
                        href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(
                          `Hi, I'm interested in the ${p.name} listed on your store.`,
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary btn-sm"
                        aria-label={`Ask about ${p.name} on WhatsApp`}
                      >
                        <MessageCircle className="h-4 w-4" /> Enquire
                      </a>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        <section className="card mt-8 flex flex-wrap items-center justify-between gap-4 p-6">
          <div>
            <h2 className="section-title">Talk to {installer.businessName}</h2>
            <p className="mt-1 text-[15px] text-muted-foreground">Questions about a product or an installation.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href={`tel:${installer.phone}`} className="btn btn-secondary">
              <Phone className="h-4 w-4" /> Call
            </a>
            <a href={`mailto:${installer.email}`} className="btn btn-secondary">
              <Mail className="h-4 w-4" /> Email
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}
