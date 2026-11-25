import { notFound } from 'next/navigation';
import { requireOnboardedInstaller } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getAppUrl } from '@/lib/app-url';
import { shortDate } from '@/lib/format';
import { PageHeader, PageShell } from '@/components/app/page';
import { ProposalBadge } from '../proposal-badge';
import { ProposalEditor } from './proposal-editor';

export const metadata = { title: 'Proposal · Inverta' };

export default async function ProposalEditPage({ params }: { params: { id: string } }) {
  const { installer } = await requireOnboardedInstaller();

  const proposal = await prisma.proposal.findFirst({
    where: { id: params.id, installerId: installer.id },
    include: {
      items: { orderBy: { sortOrder: 'asc' } },
      lead: { select: { id: true, customerName: true, customerEmail: true } },
    },
  });
  if (!proposal) notFound();

  const history = [
    `Created ${shortDate(proposal.createdAt)}`,
    proposal.sentAt && `sent ${shortDate(proposal.sentAt)}`,
    proposal.viewedAt && `opened by the customer ${shortDate(proposal.viewedAt)}`,
  ].filter(Boolean);

  return (
    <PageShell width="narrow">
      <PageHeader
        back={{ href: '/dashboard/proposals', label: 'All proposals' }}
        title={`Proposal for ${proposal.lead.customerName}`}
        lead={history.join(' · ')}
        actions={<ProposalBadge status={proposal.status} className="h-8 px-3 text-sm" />}
      />

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
    </PageShell>
  );
}
