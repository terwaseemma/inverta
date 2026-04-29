import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { requireOnboardedInstaller } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { CopyLink } from './copy-button';

export const metadata = { title: 'Dashboard · Inverta' };

export default async function DashboardOverviewPage() {
  const { installer } = await requireOnboardedInstaller();

  const [leadCount, proposalCount, calcLink] = await Promise.all([
    prisma.lead.count({ where: { installerId: installer.id } }),
    prisma.proposal.count({ where: { installerId: installer.id } }),
    prisma.calculatorLink.findUnique({ where: { installerId: installer.id } }),
  ]);

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
          Here's a quick look at {installer.businessName}.
        </p>
      </div>

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

      <section className="mt-8 rounded-xl border border-dashed bg-card/40 p-6">
        <h2 className="font-semibold">Up next</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The leads inbox, proposal builder, and catalog editor are landing in the
          next slice. Until then, your calculator is fully working — submissions
          are captured to the leads table.
        </p>
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
