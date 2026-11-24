import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Mail, MessageCircle, Phone } from 'lucide-react';
import { formatKobo } from '@inverta/shared';
import { requireMarketer } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { whatsappHref } from '@/lib/whatsapp';
import { parseResultSnapshot, systemSummary } from '@/lib/lead-utils';
import { StatusBadge } from '@/app/dashboard/leads/status-badge';

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
    <div className="container max-w-3xl py-8">
      <Link
        href="/team"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> All my leads
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{lead.customerName}</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Requested a quote{' '}
            {lead.createdAt.toLocaleDateString('en-NG', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>
        <StatusBadge status={lead.status} />
      </div>

      <section className="rounded-xl border bg-card/80 p-5 backdrop-blur">
        <h2 className="text-sm font-semibold">Contact</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {waNumber && (
            <a
              href={`https://wa.me/${waNumber}?text=${encodeURIComponent(
                `Hi ${firstName}, it's ${member.name.split(' ')[0]} from ${installer.businessName}, following up on your solar quote.`,
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted"
            >
              <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
            </a>
          )}
          <a
            href={`tel:${lead.customerPhone}`}
            className="inline-flex items-center gap-1.5 rounded-md border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted"
          >
            <Phone className="h-3.5 w-3.5" /> {lead.customerPhone}
          </a>
          <a
            href={`mailto:${lead.customerEmail}`}
            className="inline-flex items-center gap-1.5 rounded-md border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted"
          >
            <Mail className="h-3.5 w-3.5" /> {lead.customerEmail}
          </a>
        </div>
      </section>

      <section className="mt-4 rounded-xl border bg-card/80 p-5 backdrop-blur">
        <h2 className="text-sm font-semibold">What they were quoted</h2>
        <div className="mt-2 font-mono text-lg orange-text">{systemSummary(result)}</div>
        <dl className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
          {result.pricing?.totalKobo != null && (
            <div>
              Quoted total:{' '}
              <span className="font-mono text-foreground">{formatKobo(result.pricing.totalKobo)}</span>
            </div>
          )}
          {result.totalLoadW != null && (
            <div>
              Connected load:{' '}
              <span className="font-mono text-foreground">{result.totalLoadW.toLocaleString()} W</span>
            </div>
          )}
          {result.dailyEnergyWh != null && (
            <div>
              Daily energy:{' '}
              <span className="font-mono text-foreground">{(result.dailyEnergyWh / 1000).toFixed(1)} kWh</span>
            </div>
          )}
        </dl>
        <p className="mt-4 text-xs text-muted-foreground">
          {installer.businessName} prepares and sends the formal proposal. The status
          above updates as the sale moves.
        </p>
      </section>
    </div>
  );
}
