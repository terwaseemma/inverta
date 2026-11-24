import Link from 'next/link';
import { ChevronRight, Inbox, X } from 'lucide-react';
import { requireOnboardedInstaller } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { parseResultSnapshot, systemSummary } from '@/lib/lead-utils';
import { StatusBadge } from './status-badge';

export const metadata = { title: 'Leads · Inverta' };

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: { member?: string };
}) {
  const { installer } = await requireOnboardedInstaller();

  // ?member=<id> narrows to one marketer's leads — linked from the Team page.
  // Resolved against this account so a foreign id simply matches nothing.
  const filterMember = searchParams.member
    ? await prisma.member.findFirst({
        where: { id: searchParams.member, installerId: installer.id },
        select: { id: true, name: true },
      })
    : null;

  const leads = await prisma.lead.findMany({
    where: {
      installerId: installer.id,
      ...(filterMember ? { sourcedByMemberId: filterMember.id } : {}),
    },
    include: { sourcedBy: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  return (
    <div className="container max-w-4xl py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Leads</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every calculator submission lands here with the customer&apos;s contact and
          system sizing.
        </p>
        {filterMember && (
          <Link
            href="/dashboard/leads"
            className="mt-3 inline-flex items-center gap-1.5 rounded-full border bg-card/80 px-3 py-1 text-xs hover:bg-secondary"
          >
            Brought in by <span className="font-medium">{filterMember.name}</span>
            <X className="h-3 w-3" />
          </Link>
        )}
      </div>

      {leads.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card/40 p-10 text-center">
          <Inbox className="mx-auto h-10 w-10 text-muted-foreground" />
          <h2 className="mt-4 text-lg font-semibold">
            {filterMember ? `No leads from ${filterMember.name} yet` : 'No leads yet'}
          </h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            {filterMember
              ? 'Leads appear here as soon as a customer requests a quote through their link.'
              : 'Share your calculator link — every submission shows up here instantly.'}
          </p>
        </div>
      ) : (
        <div className="divide-y rounded-xl border bg-card/80 backdrop-blur">
          {leads.map((lead) => {
            const summary = systemSummary(parseResultSnapshot(lead.resultSnapshot));
            return (
              <Link
                key={lead.id}
                href={`/dashboard/leads/${lead.id}`}
                className="flex flex-wrap items-center gap-3 px-5 py-4 transition-colors hover:bg-secondary/40"
              >
                <div className="min-w-[180px] flex-1">
                  <div className="text-sm font-medium">{lead.customerName}</div>
                  <div className="text-xs text-muted-foreground">
                    {lead.customerEmail} · {lead.customerPhone}
                  </div>
                  {lead.sourcedBy && (
                    <div className="mt-0.5 text-xs text-primary">via {lead.sourcedBy.name}</div>
                  )}
                </div>
                <div className="hidden font-mono text-xs text-muted-foreground sm:block">
                  {summary}
                </div>
                <div className="text-xs text-muted-foreground">
                  {lead.createdAt.toLocaleDateString('en-NG', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </div>
                <StatusBadge status={lead.status} />
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
