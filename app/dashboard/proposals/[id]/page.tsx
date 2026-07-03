import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { requireOnboardedInstaller } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getAppUrl } from '@/lib/app-url';
import { ProposalEditor } from './proposal-editor';

export const metadata = { title: 'Proposal · Inverta' };

export default async function ProposalEditPage({
  params,
}: {
  params: { id: string };
}) {
  const { installer } = await requireOnboardedInstaller();

  const proposal = await prisma.proposal.findFirst({
    where: { id: params.id, installerId: installer.id },
    include: {
      items: { orderBy: { sortOrder: 'asc' } },
      lead: { select: { id: true, customerName: true, customerEmail: true } },
    },
  });
  if (!proposal) notFound();

  return (
    <div className="container max-w-3xl py-10">
      <Link
        href="/dashboard/proposals"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> All proposals
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          Proposal for <span className="orange-text">{proposal.lead.customerName}</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Status: {proposal.status}
          {proposal.sentAt &&
            ` · sent ${proposal.sentAt.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}`}
          {proposal.viewedAt && ' · viewed by customer'}
        </p>
      </div>

      <ProposalEditor
        proposal={{
          id: proposal.id,
          status: proposal.status,
          customMessage: proposal.customMessage ?? '',
          leadId: proposal.lead.id,
          customerEmail: proposal.lead.customerEmail,
          items: proposal.items.map((i) => ({
            name: i.name,
            description: i.description ?? '',
            quantity: i.quantity,
            unitPriceNaira: i.unitPriceKobo / 100,
          })),
        }}
        appUrl={getAppUrl()}
      />
    </div>
  );
}
