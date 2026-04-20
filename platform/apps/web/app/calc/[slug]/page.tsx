import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { APPLIANCE_PRESETS } from '@inverta/shared';
import { Calculator } from './calculator';

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
    <main className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="container flex h-16 items-center gap-3">
          {link.installer.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={link.installer.logoUrl}
              alt={link.installer.businessName}
              className="h-8 w-8 rounded object-contain"
            />
          ) : (
            <div className="grid h-8 w-8 place-items-center rounded bg-primary text-primary-foreground text-sm font-semibold">
              {link.installer.businessName[0]}
            </div>
          )}
          <div>
            <div className="text-sm font-medium">{link.installer.businessName}</div>
            <div className="text-xs text-muted-foreground">Solar sizing calculator</div>
          </div>
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
