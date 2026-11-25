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
    <div className="mx-auto w-full max-w-[1240px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mb-6 lg:mb-8">
        <h1 className="page-title">Platform overview</h1>
        <p className="page-lead">
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

      <section className="card mt-4 overflow-hidden">
        <div className="flex items-center justify-between border-b px-6 py-5">
          <h2 className="section-title">Recent signups</h2>
          <Link href="/admin/installers" className="link text-sm font-medium">
            See all
          </Link>
        </div>
        {recentSignups.length === 0 ? (
          <p className="p-6 text-[15px] text-muted-foreground">No installers yet.</p>
        ) : (
          <div className="divide-y">
            {recentSignups.map((s) => (
              <div key={s.id} className="flex flex-wrap items-center gap-3 px-6 py-4 text-[15px]">
                <div className="min-w-[160px] flex-1 font-medium">{s.businessName}</div>
                <div className="text-muted-foreground">{s.region}</div>
                <div className="text-[13px] text-muted-foreground">
                  {s.createdAt.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}
                </div>
                <span className="chip bg-card text-foreground">
                  <span aria-hidden className={s.onboardedAt ? 'h-1.5 w-1.5 rounded-full bg-success' : 'h-1.5 w-1.5 rounded-full bg-muted-foreground/50'} />
                  {s.onboardedAt ? 'Onboarded' : 'Incomplete'}
                </span>
              </div>
            ))}
          </div>
        )}
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
    <div className="card flex min-h-[132px] flex-col justify-between p-6">
      <div className="label">{label}</div>
      <div>
        <div className="figure mt-4 text-[32px] leading-none">{value}</div>
        {sub && <div className="mt-2 text-[13px] text-muted-foreground">{sub}</div>}
      </div>
    </div>
  );
}
