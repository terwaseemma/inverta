import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const metadata = { title: 'Admin · Inverta' };

const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

export default async function AdminOverviewPage() {
  await requireAdmin();
  const since = new Date(Date.now() - THIRTY_DAYS);

  const [
    installerCount,
    onboardedCount,
    leadCount,
    recentLeadCount,
    proposalCount,
    masterItemCount,
    recentSignups,
  ] = await Promise.all([
    prisma.installer.count(),
    prisma.installer.count({ where: { onboardedAt: { not: null } } }),
    prisma.lead.count(),
    prisma.lead.count({ where: { createdAt: { gte: since } } }),
    prisma.proposal.count(),
    prisma.masterCatalogItem.count({ where: { isActive: true } }),
    prisma.installer.findMany({
      orderBy: { createdAt: 'desc' },
      take: 6,
      select: {
        id: true,
        businessName: true,
        region: true,
        createdAt: true,
        onboardedAt: true,
      },
    }),
  ]);

  return (
    <div className="container max-w-5xl py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Platform overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Everything happening across Inverta.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Installers" value={installerCount} sub={`${onboardedCount} onboarded`} />
        <Stat label="Leads (all time)" value={leadCount} sub={`${recentLeadCount} in last 30 days`} />
        <Stat label="Proposals" value={proposalCount} />
        <Stat
          label="Platform products"
          value={masterItemCount}
          sub={masterItemCount === 0 ? 'Using built-in template' : 'Live for installers'}
        />
      </div>

      <section className="mt-8 rounded-xl border bg-card/80 backdrop-blur">
        <div className="border-b px-5 py-3">
          <h2 className="font-semibold">Recent signups</h2>
        </div>
        {recentSignups.length === 0 ? (
          <p className="p-5 text-sm text-muted-foreground">No installers yet.</p>
        ) : (
          <div className="divide-y">
            {recentSignups.map((s) => (
              <div key={s.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
                <div className="min-w-[160px] flex-1 font-medium">{s.businessName}</div>
                <div className="text-muted-foreground">{s.region}</div>
                <div className="text-xs text-muted-foreground">
                  {s.createdAt.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}
                </div>
                <span
                  className={
                    s.onboardedAt
                      ? 'rounded-full border border-green-500/30 bg-green-500/15 px-2 py-0.5 text-xs text-green-500'
                      : 'rounded-full border px-2 py-0.5 text-xs text-muted-foreground'
                  }
                >
                  {s.onboardedAt ? 'Onboarded' : 'Incomplete'}
                </span>
              </div>
            ))}
          </div>
        )}
        <div className="border-t px-5 py-3">
          <Link href="/admin/installers" className="text-sm orange-text hover:underline">
            View all installers →
          </Link>
        </div>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: number;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border bg-card/80 p-5 backdrop-blur">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-3xl font-semibold tracking-tight">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}
