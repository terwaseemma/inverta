import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { APPLIANCE_PRESETS } from '@inverta/shared';
import { Calculator } from './calculator';
import { Wordmark } from '@/components/brand/Wordmark';

export const dynamic = 'force-dynamic';

export default async function CalculatorPage({
  params,
}: {
  params: { slug: string };
}) {
  const link = await prisma.calculatorLink.findUnique({
    where: { slug: params.slug },
    include: {
      installer: {
        select: {
          id: true,
          businessName: true,
          slug: true,
          logoUrl: true,
          region: true,
          phone: true,
          email: true,
        },
      },
    },
  });

  if (!link || !link.isActive || !link.installer) notFound();

  return (
    <main className="min-h-screen hero-gradient">
      <header className="border-b border-border/40 bg-background/40 backdrop-blur">
        <div className="container flex h-16 items-center gap-3">
          {link.installer.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={link.installer.logoUrl}
              alt={link.installer.businessName}
              className="h-9 w-9 rounded object-contain"
            />
          ) : (
            <div className="grid h-9 w-9 place-items-center rounded bg-primary text-primary-foreground text-sm font-semibold">
              {link.installer.businessName[0]}
            </div>
          )}
          <div className="flex-1">
            <div className="text-sm font-medium">{link.installer.businessName}</div>
            <div className="text-xs text-muted-foreground">Solar sizing calculator</div>
          </div>
          <Link
            href="/"
            className="hidden items-center gap-2 text-xs text-muted-foreground hover:text-foreground sm:inline-flex"
          >
            Powered by <Wordmark size="sm" href="/" />
          </Link>
        </div>
      </header>

      <Calculator
        slug={params.slug}
        installerName={link.installer.businessName}
        region={link.installer.region}
        presets={[...APPLIANCE_PRESETS]}
      />
    </main>
  );
}
