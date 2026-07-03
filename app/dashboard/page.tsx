import Link from 'next/link';
import { ArrowUpRight, PackageOpen } from 'lucide-react';
import { requireOnboardedInstaller } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { CopyLink } from './copy-button';

export const metadata = { title: 'Dashboard · Inverta' };

export default async function DashboardOverviewPage() {
  const { installer } = await requireOnboardedInstaller();

  const [leadCount, proposalCount, calcLink, catalogTypes, notifications] =
    await Promise.all([
      prisma.lead.count({ where: { installerId: installer.id } }),
      prisma.proposal.count({ where: { installerId: installer.id } }),
      prisma.calculatorLink.findUnique({ where: { installerId: installer.id } }),
      prisma.catalogItem.groupBy({
        by: ['type'],
        where: { installerId: installer.id, isActive: true },
      }),
      prisma.notification.findMany({
        where: { installerId: installer.id },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

  // Highlight unread once, then mark them read.
  const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
  if (unreadIds.length > 0) {
    await prisma.notification.updateMany({
      where: { id: { in: unreadIds } },
      data: { read: true },
    });
  }

  const stocked = new Set(catalogTypes.map((c) => c.type));
  // Complete = panels + a power/storage path (inverter+battery OR a generator).
  const catalogIncomplete = !(
    stocked.has('PANEL') &&
    ((stocked.has('INVERTER') && stocked.has('BATTERY')) || stocked.has('GENERATOR'))
  );

  const calcUrl = calcLink
    ? `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/calc/${calcLink.slug}`
    : null;

  return (
    <div className="container max-w-5xl py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back,{' '}
          <span className="orange-text">{installer.contactName.split(' ')[0]}</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Here&apos;s a quick look at {installer.businessName}.
        </p>
      </div>

      {catalogIncomplete && (
        <div className="mb-6 flex flex-wrap items-center gap-4 rounded-xl border border-accent/40 bg-accent/10 p-4">
          <PackageOpen className="h-5 w-5 shrink-0 text-accent" />
          <div className="min-w-[200px] flex-1 text-sm">
            <span className="font-medium">Your calculator shows sizing only.</span>{' '}
            <span className="text-muted-foreground">
              Stock a panel plus an inverter and battery — or an all-in-one solar
              generator — to show customers real prices.
            </span>
          </div>
          <Link
            href="/dashboard/catalog"
            className="signup-gradient-hover glass-button inline-flex h-9 items-center rounded-md px-4 text-sm font-medium text-foreground transition-all duration-200"
          >
            Set up catalog
          </Link>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Leads captured" value={leadCount} />
        <StatCard label="Proposals sent" value={proposalCount} />
        <StatCard
          label="Conversion"
          value={
            leadCount > 0
              ? `${Math.round((proposalCount / leadCount) * 100)}%`
              : '—'
          }
        />
      </div>

      {calcUrl && calcLink && (
        <section className="mt-8 rounded-xl border bg-card/80 p-6 backdrop-blur">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-semibold">Your calculator link</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Share this with potential customers — every submission becomes a lead.
              </p>
            </div>
            <Link
              href={`/calc/${calcLink.slug}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 text-sm orange-text hover:underline"
            >
              Preview <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-md border bg-secondary/40 p-3 font-mono text-sm">
            <span className="flex-1 truncate">{calcUrl}</span>
            <CopyLink url={calcUrl} />
          </div>
        </section>
      )}

      <section className="mt-8 rounded-xl border bg-card/80 p-6 backdrop-blur">
        <h2 className="font-semibold">Recent activity</h2>
        {notifications.length === 0 ? (
          <p className="mt-1 text-sm text-muted-foreground">
            Nothing yet — activity from your calculator and proposals shows up here.
          </p>
        ) : (
          <div className="mt-3 divide-y">
            {notifications.map((n) => {
              const inner = (
                <div className="flex items-start gap-3 py-3">
                  <span
                    className={
                      unreadIds.includes(n.id)
                        ? 'mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary'
                        : 'mt-1.5 h-2 w-2 shrink-0 rounded-full bg-border'
                    }
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{n.title}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {n.message}
                    </div>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {n.createdAt.toLocaleDateString('en-NG', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                </div>
              );
              return n.linkUrl ? (
                <Link key={n.id} href={n.linkUrl} className="block transition-colors hover:bg-secondary/30">
                  {inner}
                </Link>
              ) : (
                <div key={n.id}>{inner}</div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border bg-card/80 p-5 backdrop-blur">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-3xl font-semibold tracking-tight">{value}</div>
    </div>
  );
}
