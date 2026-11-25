import { notFound } from 'next/navigation';
import { Download, Globe, Mail, MessageCircle, Phone } from 'lucide-react';
import { formatKobo } from '@inverta/shared';
import { prisma } from '@/lib/prisma';
import { notifyProposalViewed } from '@/lib/notifications';
import { captureServer, nairaBand } from '@/lib/analytics-server';
import { TrackedLink } from '@/components/analytics/TrackedLink';
import { SystemDiagram } from '@/components/proposal/SystemDiagram';
import { getInstalledSystem } from '@/lib/proposal-system';

export const metadata = { title: 'Your solar proposal · Inverta' };
export const dynamic = 'force-dynamic';

// Public customer view — reachable only via the unguessable cuid link the
// installer shares. First open after sending flips SENT → VIEWED and
// notifies the installer.
export default async function PublicProposalPage({
  params,
}: {
  params: { id: string };
}) {
  const proposal = await prisma.proposal.findUnique({
    where: { id: params.id },
    include: {
      items: { orderBy: { sortOrder: 'asc' } },
      installer: {
        select: {
          businessName: true,
          logoUrl: true,
          phone: true,
          email: true,
          websiteUrl: true,
          bankName: true,
          bankAccountNumber: true,
          bankAccountName: true,
        },
      },
      lead: { select: { customerName: true, resultSnapshot: true } },
    },
  });
  if (!proposal) notFound();

  if (proposal.status === 'SENT' && !proposal.viewedAt) {
    await prisma.proposal.update({
      where: { id: proposal.id },
      data: { status: 'VIEWED', viewedAt: new Date() },
    });
    try {
      await notifyProposalViewed({
        installerId: proposal.installerId,
        installerEmail: proposal.installer.email,
        proposalId: proposal.id,
        customerName: proposal.lead.customerName,
      });
    } catch {
      // non-fatal
    }
    // Once, on the first open after sending: hours from send to open.
    await captureServer('proposal_viewed', proposal.installerId, {
      hours_to_view: proposal.sentAt
        ? Math.round((Date.now() - proposal.sentAt.getTime()) / 36e5)
        : null,
      price_naira_band: nairaBand(proposal.totalKobo),
    });
  }

  const installer = proposal.installer;
  const system = await getInstalledSystem(proposal);
  const firstName = proposal.lead.customerName.split(' ')[0] ?? '';
  const waNumber = installer.phone.replace(/[^\d]/g, '');
  const validUntil = proposal.validUntil?.toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Africa/Lagos',
  });

  return (
    <main className="min-h-screen">
      <header className="border-b bg-card">
        <div className="mx-auto flex h-16 w-full max-w-3xl items-center gap-3 px-4 sm:px-6">
          {installer.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={installer.logoUrl}
              alt={installer.businessName}
              className="h-10 w-10 rounded-xl border bg-card object-contain p-1"
            />
          ) : (
            <span
              aria-hidden
              className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-base font-semibold text-primary-foreground"
            >
              {installer.businessName.trim()[0]?.toUpperCase()}
            </span>
          )}
          <div className="min-w-0">
            <div className="truncate text-[15px] font-semibold">{installer.businessName}</div>
            <div className="text-[13px] text-muted-foreground">Solar proposal</div>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
        {/* The answer first. */}
        <section className="rounded-[24px] bg-primary p-6 text-primary-foreground sm:p-8">
          <div className="text-[15px] font-medium opacity-80">
            Hi {firstName}, your proposal from {installer.businessName}
          </div>
          <div className="figure mt-3 text-[40px] leading-none sm:text-[52px]">
            {formatKobo(proposal.totalKobo)}
          </div>
          {validUntil && <div className="mt-3 text-[15px] opacity-80">Valid until {validUntil}</div>}
        </section>

        {proposal.customMessage && (
          <section className="card mt-4 p-6">
            <p className="whitespace-pre-line text-[15px] leading-relaxed">{proposal.customMessage}</p>
          </section>
        )}

        {system && (
          <section className="card mt-4 p-6 sm:p-8" aria-labelledby="system">
            <h2 id="system" className="section-title">
              Your system, as it will be installed
            </h2>
            <p className="mt-1 text-[15px] text-muted-foreground">
              The panels on your roof charge the battery through the inverter, which powers your home.
            </p>
            <div className="mt-6">
              <SystemDiagram system={system} />
            </div>
          </section>
        )}

        <section className="card mt-4" aria-labelledby="items">
          <h2 id="items" className="section-title px-6 pt-6">
            What&apos;s included
          </h2>
          <ul className="mt-2 divide-y">
            {proposal.items.map((item) => (
              <li key={item.id} className="flex items-start justify-between gap-4 px-6 py-3.5">
                <div className="min-w-0">
                  <div className="text-[15px]">{item.name}</div>
                  {(item.description || item.quantity > 1) && (
                    <div className="text-[13px] text-muted-foreground">
                      {item.quantity > 1 && (
                        <span className="tabular-nums">
                          {item.quantity} × {formatKobo(item.unitPriceKobo)}
                        </span>
                      )}
                      {item.quantity > 1 && item.description && ' · '}
                      {item.description}
                    </div>
                  )}
                </div>
                <div className="figure shrink-0 text-[15px]">
                  {formatKobo(item.quantity * item.unitPriceKobo)}
                </div>
              </li>
            ))}
          </ul>
          <div className="flex items-baseline justify-between gap-4 border-t px-6 py-5">
            <span className="text-[15px] font-semibold">Total</span>
            <span className="figure text-[24px]">{formatKobo(proposal.totalKobo)}</span>
          </div>
        </section>

        {installer.bankAccountNumber && (
          <section className="card mt-4 p-6" aria-labelledby="pay">
            <h2 id="pay" className="section-title">
              How to pay
            </h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-3">
              <div>
                <dt className="label">Account number</dt>
                <dd className="figure mt-1 text-[20px]">{installer.bankAccountNumber}</dd>
              </div>
              {installer.bankName && (
                <div>
                  <dt className="label">Bank</dt>
                  <dd className="mt-1 text-[15px] font-medium">{installer.bankName}</dd>
                </div>
              )}
              {installer.bankAccountName && (
                <div>
                  <dt className="label">Account name</dt>
                  <dd className="mt-1 text-[15px] font-medium">{installer.bankAccountName}</dd>
                </div>
              )}
            </dl>
          </section>
        )}

        <section className="card mt-4 p-6 sm:p-8" aria-labelledby="ahead">
          <h2 id="ahead" className="text-[20px] font-semibold tracking-[-0.01em]">
            Ready to go ahead?
          </h2>
          <p className="mt-1.5 text-[15px] leading-relaxed text-muted-foreground">
            Message {installer.businessName} to book your installation, or ask anything
            about the system first.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {waNumber && (
              <TrackedLink
                event="proposal_accept_clicked"
                eventProps={{ channel: 'whatsapp', price_naira_band: Math.round(proposal.totalKobo / 100 / 1000) * 1000 }}
                href={`https://wa.me/${waNumber}?text=${encodeURIComponent(
                  `Hi ${installer.businessName}, I've read my solar proposal (${formatKobo(proposal.totalKobo)}) and I'd like to go ahead.`,
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
              >
                <MessageCircle className="h-4 w-4" /> Go ahead on WhatsApp
              </TrackedLink>
            )}
            <TrackedLink
              event="proposal_pdf_downloaded"
              href={`/api/proposals/${proposal.id}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
            >
              <Download className="h-4 w-4" /> Download PDF
            </TrackedLink>
          </div>
          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-[15px]">
            <a href={`tel:${installer.phone}`} className="link inline-flex items-center gap-1.5">
              <Phone className="h-4 w-4" /> {installer.phone}
            </a>
            <a href={`mailto:${installer.email}`} className="link inline-flex items-center gap-1.5">
              <Mail className="h-4 w-4" /> {installer.email}
            </a>
            {installer.websiteUrl && (
              <a
                href={installer.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="link inline-flex items-center gap-1.5"
              >
                <Globe className="h-4 w-4" /> Website
              </a>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
