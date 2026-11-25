import { notFound } from 'next/navigation';
import { Mail, MessageCircle, Phone } from 'lucide-react';
import { formatKobo } from '@inverta/shared';
import { requireMarketer } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { whatsappHref } from '@/lib/whatsapp';
import { parseResultSnapshot, systemSummary } from '@/lib/lead-utils';
import { StatusBadge } from '@/app/dashboard/leads/status-badge';
import { PageHeader } from '@/components/app/page';

export const metadata = { title: 'Lead · Inverta' };

// Read-only view of one of the marketer's own leads: enough to follow up with
// the customer and see where the sale stands. Status is the owner's to move,
// and this page deliberately does not flip NEW to VIEWED — that status tracks
// whether the OWNER has triaged the lead, which a marketer opening it says
// nothing about.
export default async function TeamLeadPage({ params }: { params: { id: string } }) {
  const { installer, member } = await requireMarketer();

  const lead = await prisma.lead.findFirst({
    where: { id: params.id, installerId: installer.id, sourcedByMemberId: member.id },
  });
  // Another marketer's lead, or the owner's, is a 404 — not a 403 that would
  // confirm the lead exists.
  if (!lead) notFound();

  const result = parseResultSnapshot(lead.resultSnapshot);
  const firstName = lead.customerName.split(' ')[0] ?? '';
  const waNumber = lead.customerPhone.replace(/[^\d]/g, '');

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <PageHeader
        back={{ href: '/team', label: 'All my leads' }}
        title={lead.customerName}
        lead={`Requested a quote ${lead.createdAt.toLocaleDateString('en-NG', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          timeZone: 'Africa/Lagos',
        })}`}
        actions={<StatusBadge status={lead.status} className="h-8 px-3 text-sm" />}
      />

      <section className="card p-6">
        <h2 className="section-title">Contact</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {waNumber && (
            <a
              href={`https://wa.me/${waNumber}?text=${encodeURIComponent(
                `Hi ${firstName}, it's ${member.name.split(' ')[0]} from ${installer.businessName}, following up on your solar quote.`,
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary btn-sm"
            >
              <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
            </a>
          )}
          <a
            href={`tel:${lead.customerPhone}`}
            className="btn btn-secondary btn-sm"
          >
            <Phone className="h-3.5 w-3.5" /> {lead.customerPhone}
          </a>
          <a
            href={`mailto:${lead.customerEmail}`}
            className="btn btn-secondary btn-sm"
          >
            <Mail className="h-3.5 w-3.5" /> {lead.customerEmail}
          </a>
        </div>
      </section>

      <section className="card mt-4 p-5">
        <h2 className="section-title">What they were quoted</h2>
        <div className="figure mt-2 text-[22px] leading-tight">{systemSummary(result)}</div>
        <dl className="mt-3 grid gap-2 text-[13px] text-muted-foreground sm:grid-cols-2">
          {result.pricing?.totalKobo != null && (
            <div>
              Quoted total:{' '}
              <span className="figure text-foreground">{formatKobo(result.pricing.totalKobo)}</span>
            </div>
          )}
          {result.totalLoadW != null && (
            <div>
              Connected load:{' '}
              <span className="figure text-foreground">{result.totalLoadW.toLocaleString()} W</span>
            </div>
          )}
          {result.dailyEnergyWh != null && (
            <div>
              Daily energy:{' '}
              <span className="figure text-foreground">{(result.dailyEnergyWh / 1000).toFixed(1)} kWh</span>
            </div>
          )}
        </dl>
        <p className="mt-4 text-[13px] text-muted-foreground">
          {installer.businessName} prepares and sends the formal proposal. The status
          above updates as the sale moves.
        </p>
      </section>
    </div>
  );
}
