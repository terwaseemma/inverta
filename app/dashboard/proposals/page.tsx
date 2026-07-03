import Link from 'next/link';
import { ChevronRight, FileText } from 'lucide-react';
import { formatKobo } from '@inverta/shared';
import { requireOnboardedInstaller } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const metadata = { title: 'Proposals · Inverta' };

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  SENT: 'Sent',
  VIEWED: 'Viewed',
  ACCEPTED: 'Accepted',
  DECLINED: 'Declined',
};

export default async function ProposalsPage() {
  const { installer } = await requireOnboardedInstaller();

  const proposals = await prisma.proposal.findMany({
    where: { installerId: installer.id },
    include: { lead: { select: { customerName: true } } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  return (
    <div className="container max-w-4xl py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Proposals</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Draft, send, and track formal quotes. Create proposals from a lead&apos;s
          detail page.
        </p>
      </div>

      {proposals.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card/40 p-10 text-center">
          <FileText className="mx-auto h-10 w-10 text-muted-foreground" />
          <h2 className="mt-4 text-lg font-semibold">No proposals yet</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Open a lead and click &ldquo;Create proposal&rdquo; to draft your first quote.
          </p>
          <Link
            href="/dashboard/leads"
            className="signup-gradient-hover glass-button mt-5 inline-flex h-10 items-center rounded-md px-5 text-sm font-medium text-foreground transition-all duration-200"
          >
            Go to leads
          </Link>
        </div>
      ) : (
        <div className="divide-y rounded-xl border bg-card/80 backdrop-blur">
          {proposals.map((p) => (
            <Link
              key={p.id}
              href={`/dashboard/proposals/${p.id}`}
              className="flex flex-wrap items-center gap-3 px-5 py-4 transition-colors hover:bg-secondary/40"
            >
              <div className="min-w-[160px] flex-1">
                <div className="text-sm font-medium">{p.lead.customerName}</div>
                <div className="text-xs text-muted-foreground">
                  Created{' '}
                  {p.createdAt.toLocaleDateString('en-NG', {
                    day: 'numeric',
                    month: 'short',
                  })}
                  {p.validUntil &&
                    ` · valid until ${p.validUntil.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}`}
                </div>
              </div>
              <div className="font-mono text-sm">{formatKobo(p.totalKobo)}</div>
              <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium">
                {STATUS_LABELS[p.status] ?? p.status}
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
