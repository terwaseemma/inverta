import { notFound } from 'next/navigation';
import { Download } from 'lucide-react';
import { formatKobo } from '@inverta/shared';
import { prisma } from '@/lib/prisma';
import { notifyProposalViewed } from '@/lib/notifications';

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
      lead: { select: { customerName: true } },
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
        proposalId: proposal.id,
        customerName: proposal.lead.customerName,
      });
    } catch {
      // non-fatal
    }
  }

  const installer = proposal.installer;

  return (
    <main className="min-h-screen hero-gradient">
      <header className="border-b border-border/40 bg-background/40 backdrop-blur">
        <div className="container flex h-16 items-center gap-3">
          {installer.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={installer.logoUrl}
              alt={installer.businessName}
              className="h-9 w-9 rounded object-contain"
            />
          ) : (
            <div className="grid h-9 w-9 place-items-center rounded bg-primary text-sm font-semibold text-primary-foreground">
              {installer.businessName[0]}
            </div>
          )}
          <div>
            <div className="text-sm font-medium">{installer.businessName}</div>
            <div className="text-xs text-muted-foreground">Solar proposal</div>
          </div>
        </div>
      </header>

      <div className="container max-w-2xl py-10">
        <div className="rounded-xl border bg-card/80 p-6 backdrop-blur">
          <h1 className="text-2xl font-bold tracking-tight">
            Hi {proposal.lead.customerName.split(' ')[0]},
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            here&apos;s your solar system proposal from {installer.businessName}
            {proposal.validUntil &&
              ` — valid until ${proposal.validUntil.toLocaleDateString('en-NG', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}`}
            .
          </p>

          {proposal.customMessage && (
            <div className="mt-4 rounded-md border border-primary/30 bg-primary/5 p-4 text-sm">
              {proposal.customMessage}
            </div>
          )}

          <table className="mt-6 w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="py-2 font-medium">Item</th>
                <th className="py-2 text-right font-medium">Qty</th>
                <th className="py-2 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {proposal.items.map((item) => (
                <tr key={item.id}>
                  <td className="py-2">
                    {item.name}
                    {item.description && (
                      <div className="text-xs text-muted-foreground">
                        {item.description}
                      </div>
                    )}
                  </td>
                  <td className="py-2 text-right font-mono">{item.quantity}</td>
                  <td className="py-2 text-right font-mono">
                    {formatKobo(item.quantity * item.unitPriceKobo)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-4 flex items-center justify-between border-t pt-4">
            <span className="font-semibold">Total</span>
            <span className="font-mono text-xl font-semibold orange-text">
              {formatKobo(proposal.totalKobo)}
            </span>
          </div>

          {installer.bankAccountNumber && (
            <div className="mt-6 rounded-md border border-primary/30 bg-primary/5 p-4">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Payment details
              </div>
              <div className="mt-1 font-mono text-sm">
                {installer.bankAccountNumber}
                {installer.bankName && ` · ${installer.bankName}`}
              </div>
              {installer.bankAccountName && (
                <div className="text-sm text-muted-foreground">
                  {installer.bankAccountName}
                </div>
              )}
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href={`/api/proposals/${proposal.id}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="signup-gradient-hover glass-button inline-flex h-10 items-center gap-2 rounded-md px-4 text-sm font-medium text-foreground transition-all duration-200"
            >
              <Download className="h-4 w-4" /> Download PDF
            </a>
          </div>
        </div>

        <div className="mt-6 rounded-xl border bg-card/60 p-5 text-sm backdrop-blur">
          <div className="font-medium">Questions? Talk to {installer.businessName}:</div>
          <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-muted-foreground">
            <a href={`tel:${installer.phone}`} className="hover:text-foreground">
              📞 {installer.phone}
            </a>
            <a href={`mailto:${installer.email}`} className="hover:text-foreground">
              ✉️ {installer.email}
            </a>
            {installer.websiteUrl && (
              <a
                href={installer.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground"
              >
                🌐 Website
              </a>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
