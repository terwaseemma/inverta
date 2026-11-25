import Link from 'next/link';
import { ChevronRight, FileText } from 'lucide-react';
import { formatKobo } from '@inverta/shared';
import { requireOnboardedInstaller } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { shortDate } from '@/lib/format';
import { EmptyState, PageHeader, PageShell } from '@/components/app/page';
import { ProposalBadge } from './proposal-badge';

export const metadata = { title: 'Proposals · Inverta' };

export default async function ProposalsPage() {
  const { installer } = await requireOnboardedInstaller();

  const proposals = await prisma.proposal.findMany({
    where: { installerId: installer.id },
    include: { lead: { select: { customerName: true } } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  return (
    <PageShell>
      <PageHeader
        title="Proposals"
        lead="Formal quotes you send customers. Start one from a lead — it opens with the system the calculator sized."
      />

      {proposals.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No proposals yet"
          action={
            <Link href="/dashboard/leads" className="btn btn-primary">
              Go to leads
            </Link>
          }
        >
          Open a lead and choose Create proposal to draft your first quote.
        </EmptyState>
      ) : (
        <ul className="card divide-y overflow-hidden">
          {proposals.map((p) => (
            <li key={p.id}>
              <Link
                href={`/dashboard/proposals/${p.id}`}
                className="row-link flex items-center gap-4 px-5 py-4 sm:px-6"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[15px] font-medium">{p.lead.customerName}</div>
                  <div className="truncate text-[13px] text-muted-foreground">
                    Created {shortDate(p.createdAt)}
                    {p.viewedAt && ` · opened ${shortDate(p.viewedAt)}`}
                    {p.validUntil && ` · valid until ${shortDate(p.validUntil)}`}
                  </div>
                </div>
                <div className="figure hidden text-[15px] sm:block">{formatKobo(p.totalKobo)}</div>
                <div className="flex shrink-0 sm:w-[104px]"><ProposalBadge status={p.status} /></div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}
