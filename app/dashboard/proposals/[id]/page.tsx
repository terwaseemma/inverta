import { notFound } from 'next/navigation';
import { requireOnboardedInstaller } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getAppUrl } from '@/lib/app-url';
import { shortDate } from '@/lib/format';
import { PageHeader, PageShell } from '@/components/app/page';
import { ProposalBadge } from '../proposal-badge';
import { ProposalEditor } from './proposal-editor';
import { SystemDiagram } from '@/components/proposal/SystemDiagram';
import { getInstalledSystem } from '@/lib/proposal-system';

export const metadata = { title: 'Proposal · Inverta' };

export default async function ProposalEditPage({ params }: { params: { id: string } }) {
  const { installer } = await requireOnboardedInstaller();

  const proposal = await prisma.proposal.findFirst({
    where: { id: params.id, installerId: installer.id },
    include: {
      items: { orderBy: { sortOrder: 'asc' } },
      lead: { select: { id: true, customerName: true, customerEmail: true, resultSnapshot: true } },
    },
  });
  if (!proposal) notFound();

  // The picture the customer sees, from the saved line items (refreshes on save).
  const system = await getInstalledSystem(proposal);

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

      {system && (
        <section className="card mb-4 p-6" aria-labelledby="system">
          <h2 id="system" className="section-title">
            What the customer sees
          </h2>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Drawn from the line items below: change a quantity and save to update it.
          </p>
          <div className="mt-5">
            <SystemDiagram system={system} />
          </div>
        </section>
      )}

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
