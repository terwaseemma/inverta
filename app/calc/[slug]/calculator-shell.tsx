import { notFound } from 'next/navigation';
import Link from 'next/link';
import { APPLIANCE_PRESETS } from '@inverta/shared';
import { getActiveMarketer, getCalculatorLink } from '@/lib/public-data';
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
  // Shared with generateMetadata (lib/public-data): one query each per request.
  const link = await getCalculatorLink(slug);

  if (!link || !link.isActive || !link.installer) notFound();

  const marketer = await getActiveMarketer(link.installer.id, memberCode);

  const initial = link.installer.businessName.trim()[0]?.toUpperCase() ?? 'S';

  return (
    <main className="min-h-screen">
      <header className="border-b bg-card">
        <div className="mx-auto flex h-16 w-full max-w-3xl items-center gap-3 px-4 sm:px-6">
          {link.installer.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={link.installer.logoUrl}
              alt={link.installer.businessName}
              className="h-10 w-10 rounded-xl border bg-card object-contain p-1"
            />
          ) : (
            <span
              aria-hidden
              className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-base font-semibold text-primary-foreground"
            >
              {initial}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate text-[15px] font-semibold">{link.installer.businessName}</div>
            <div className="truncate text-[13px] text-muted-foreground">
              {marketer
                ? `Solar quote · with ${marketer.name.split(' ')[0]}`
                : 'Free solar quote in 2 minutes'}
            </div>
          </div>
          <Link
            href="/"
            className="hidden items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
          >
            Powered by <Wordmark size="sm" />
          </Link>
          <ThemeToggle />
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
