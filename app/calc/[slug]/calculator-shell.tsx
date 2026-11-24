import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { APPLIANCE_PRESETS, normalizeMemberCode } from '@inverta/shared';
import { Calculator } from './calculator';
import { Wordmark } from '@/components/brand/Wordmark';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

// The public calculator page, shared by the installer's own link
// (/calc/<slug>) and each marketer's (/calc/<slug>/m/<code>).
//
// A marketer code that does not resolve — mistyped, or a marketer whose access
// was switched off — still renders the full calculator, just without credit.
// The customer holding that link wants a quote; a 404 would lose the sale to
// punish an attribution problem.
export async function CalculatorShell({
  slug,
  memberCode,
}: {
  slug: string;
  memberCode?: string;
}) {
  const link = await prisma.calculatorLink.findUnique({
    where: { slug },
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

  const code = normalizeMemberCode(memberCode);
  const marketer = code
    ? await prisma.member.findFirst({
        where: { code, installerId: link.installer.id, role: 'MARKETER', isActive: true },
        select: { name: true, code: true },
      })
    : null;

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
            <div className="text-xs text-muted-foreground">
              {marketer
                ? `Solar sizing calculator · with ${marketer.name.split(' ')[0]}`
                : 'Solar sizing calculator'}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="hidden items-center gap-2 text-xs text-muted-foreground hover:text-foreground sm:inline-flex"
            >
              Powered by <Wordmark size="sm" />
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <Calculator
        slug={slug}
        installerName={link.installer.businessName}
        region={link.installer.region}
        presets={[...APPLIANCE_PRESETS]}
        memberCode={marketer?.code ?? undefined}
      />
    </main>
  );
}
