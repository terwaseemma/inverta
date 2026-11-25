import Link from 'next/link';
import { MapPin, ShoppingBag, Zap } from 'lucide-react';
import { NIGERIAN_STATES } from '@inverta/shared';
import { prisma } from '@/lib/prisma';
import { Header } from '@/components/marketing/Header';
import { Footer } from '@/components/marketing/Footer';

export const metadata = {
  title: 'Find an installer · Inverta',
  description: 'Browse verified solar installers across Nigeria by state.',
};
export const dynamic = 'force-dynamic';

export default async function InstallersPage({
  searchParams,
}: {
  searchParams: { state?: string };
}) {
  // Only show a state filter that's actually a Nigerian state — anything else
  // (or nothing) means "all".
  const state =
    searchParams.state && NIGERIAN_STATES.includes(searchParams.state)
      ? searchParams.state
      : undefined;

  const installers = await prisma.installer.findMany({
    where: {
      onboardedAt: { not: null },
      ...(state ? { region: state } : {}),
    },
    select: {
      id: true,
      businessName: true,
      slug: true,
      region: true,
      logoUrl: true,
      bio: true,
      calculatorLink: { select: { slug: true, isActive: true } },
    },
    orderBy: [{ region: 'asc' }, { businessName: 'asc' }],
  });

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="container max-w-5xl flex-1 py-12">
        <div className="mb-8">
          <h1 className="text-[34px] font-semibold leading-tight tracking-[-0.025em] md:text-[44px]">
            Find a solar installer <span className="orange-text italic">near you.</span>
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Every installer below runs a live calculator on Inverta — size your
            system with their real prices and they&apos;ll follow up with a formal
            quote.
          </p>
        </div>

        {/* State filter — plain GET form, works without JS */}
        <form method="get" className="mb-8 flex flex-wrap items-center gap-3">
          <select name="state" defaultValue={state ?? ''} className="input max-w-[240px]">
            <option value="">All states</option>
            {NIGERIAN_STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="btn btn-secondary"
          >
            Filter
          </button>
          {state && (
            <Link
              href="/installers"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Clear
            </Link>
          )}
        </form>

        {installers.length === 0 ? (
          <div className="card border-dashed p-10 text-center">
            <MapPin className="mx-auto h-10 w-10 text-muted-foreground" />
            <h2 className="mt-4 text-[17px] font-semibold">
              No installers in {state ?? 'this area'} yet
            </h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
              Inverta is growing — check back soon, or are you an installer here?
            </p>
            <Link
              href="/signup"
              className="btn btn-primary mt-5"
            >
              Be the first in {state ?? 'your state'}
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {installers.map((inst) => (
              <div
                key={inst.id}
                className="card flex flex-col p-5"
              >
                <div className="flex items-center gap-3">
                  {inst.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={inst.logoUrl}
                      alt={inst.businessName}
                      className="h-11 w-11 rounded-md border object-contain"
                    />
                  ) : (
                    <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary text-lg font-semibold text-primary-foreground">
                      {inst.businessName[0]}
                    </div>
                  )}
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold">{inst.businessName}</h3>
                    <div className="flex items-center gap-1 text-[13px] text-muted-foreground">
                      <MapPin className="h-3 w-3" /> {inst.region}
                    </div>
                  </div>
                </div>
                {inst.bio && (
                  <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
                    {inst.bio}
                  </p>
                )}
                <div className="mt-auto flex gap-2 pt-4">
                  {inst.calculatorLink?.isActive && (
                    <Link
                      href={`/calc/${inst.calculatorLink.slug}`}
                      className="btn btn-primary btn-sm flex-1"
                    >
                      <Zap className="h-3.5 w-3.5" /> Get a quote
                    </Link>
                  )}
                  <Link
                    href={`/store/${inst.slug}`}
                    className="btn btn-secondary btn-sm flex-1"
                  >
                    <ShoppingBag className="h-3.5 w-3.5" /> Store
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
