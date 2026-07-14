import Link from 'next/link';
import { ExternalLink, Power } from 'lucide-react';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { toggleInstallerCalculatorAction } from './actions';
import { cn } from '@/lib/utils';

export const metadata = { title: 'Installers · Inverta Admin' };

export default async function AdminInstallersPage() {
  await requireAdmin();

  const installers = await prisma.installer.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      businessName: true,
      email: true,
      region: true,
      role: true,
      createdAt: true,
      onboardedAt: true,
      calculatorLink: { select: { slug: true, isActive: true } },
      _count: { select: { leads: true, proposals: true, catalogItems: true } },
    },
  });

  return (
    <div className="container max-w-5xl py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Installers</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every account on the platform. The power button deactivates an
          installer&apos;s public calculator without touching their data.
        </p>
      </div>

      <div className="divide-y rounded-xl border bg-card/80 backdrop-blur">
        {installers.map((inst) => (
          <div key={inst.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
            <div className="min-w-[200px] flex-1">
              <div className="text-sm font-medium">
                {inst.businessName}
                {inst.role === 'ADMIN' && (
                  <span className="ml-2 rounded-full border border-primary/40 bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-primary">
                    Admin
                  </span>
                )}
                {!inst.onboardedAt && (
                  <span className="ml-2 rounded-full border px-2 py-0.5 text-[10px] text-muted-foreground">
                    Not onboarded
                  </span>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                {inst.email} · {inst.region} · joined{' '}
                {inst.createdAt.toLocaleDateString('en-NG', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </div>
            </div>

            <div className="font-mono text-xs text-muted-foreground">
              {inst._count.leads} leads · {inst._count.proposals} proposals ·{' '}
              {inst._count.catalogItems} products
            </div>

            <div className="flex items-center gap-1">
              {inst.calculatorLink?.isActive && (
                <Link
                  href={`/calc/${inst.calculatorLink.slug}`}
                  target="_blank"
                  aria-label={`Open ${inst.businessName}'s calculator`}
                  className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              )}
              {inst.calculatorLink && (
                <form action={toggleInstallerCalculatorAction}>
                  <input type="hidden" name="installerId" value={inst.id} />
                  <button
                    type="submit"
                    aria-label={
                      inst.calculatorLink.isActive
                        ? 'Deactivate calculator'
                        : 'Activate calculator'
                    }
                    title={
                      inst.calculatorLink.isActive
                        ? 'Calculator live — click to deactivate'
                        : 'Calculator disabled — click to activate'
                    }
                    className={cn(
                      'grid h-8 w-8 place-items-center rounded-md transition-colors',
                      inst.calculatorLink.isActive
                        ? 'text-green-500 hover:bg-muted'
                        : 'text-destructive hover:bg-muted',
                    )}
                  >
                    <Power className="h-3.5 w-3.5" />
                  </button>
                </form>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
