import Link from 'next/link';
import { ChevronRight, Inbox, MessageCircle } from 'lucide-react';
import { requireMarketer } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getAppUrl } from '@/lib/app-url';
import { whatsappHref } from '@/lib/whatsapp';
import { parseResultSnapshot, systemSummary } from '@/lib/lead-utils';
import { CopyLink } from '@/app/dashboard/copy-button';
import { StatusBadge } from '@/app/dashboard/leads/status-badge';

export const metadata = { title: 'My leads · Inverta' };

export default async function TeamHomePage() {
  const { installer, member } = await requireMarketer();

  const [calcLink, leads] = await Promise.all([
    prisma.calculatorLink.findUnique({
      where: { installerId: installer.id },
      select: { slug: true, isActive: true },
    }),
    // Scoped twice over: this account, and this marketer's own leads only.
    prisma.lead.findMany({
      where: { installerId: installer.id, sourcedByMemberId: member.id },
      orderBy: { createdAt: 'desc' },
      take: 200,
    }),
  ]);

  const myLink =
    calcLink && member.code ? `${getAppUrl()}/calc/${calcLink.slug}/m/${member.code}` : null;

  const converted = leads.filter((l) => l.status === 'CONVERTED').length;
  const inProgress = leads.filter((l) => l.status === 'PROPOSAL_SENT').length;

  return (
    <div className="container max-w-3xl py-8">
      <section className="rounded-xl border bg-card/80 p-6 backdrop-blur">
        <h1 className="text-xl font-bold tracking-tight">Your quote link</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Share it with anyone thinking about solar. When they request a quote through
          it, the lead is credited to you and shows up below.
        </p>

        {myLink && calcLink?.isActive ? (
          <div className="mt-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded bg-background/60 px-2 py-1.5 font-mono text-xs">
                {myLink}
              </code>
              <CopyLink url={myLink} />
            </div>
            <a
              href={whatsappHref(
                `Thinking about solar? Get a free instant quote from ${installer.businessName} — see the system you need and the price in 2 minutes: ${myLink}`,
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="signup-gradient-hover glass-button inline-flex h-10 w-full items-center justify-center gap-2 rounded-md px-5 text-sm font-medium text-foreground sm:w-auto"
            >
              <MessageCircle className="h-4 w-4" /> Share on WhatsApp
            </a>
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">
            {installer.businessName}&apos;s calculator is switched off right now, so
            there&apos;s no link to share. Check back later.
          </p>
        )}
      </section>

      <div className="mt-6 grid grid-cols-3 gap-3">
        <Stat label="Leads" value={leads.length} />
        <Stat label="Proposal sent" value={inProgress} />
        <Stat label="Converted" value={converted} />
      </div>

      <section className="mt-6">
        <h2 className="mb-3 font-semibold">Your leads</h2>
        {leads.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-card/40 p-8 text-center">
            <Inbox className="mx-auto h-9 w-9 text-muted-foreground" />
            <p className="mx-auto mt-3 max-w-sm text-sm text-muted-foreground">
              No leads yet. Every quote requested through your link lands here.
            </p>
          </div>
        ) : (
          <div className="divide-y rounded-xl border bg-card/80 backdrop-blur">
            {leads.map((lead) => (
              <Link
                key={lead.id}
                href={`/team/leads/${lead.id}`}
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-secondary/40"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{lead.customerName}</div>
                  <div className="truncate font-mono text-xs text-muted-foreground">
                    {systemSummary(parseResultSnapshot(lead.resultSnapshot))}
                  </div>
                </div>
                <div className="hidden text-xs text-muted-foreground sm:block">
                  {lead.createdAt.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}
                </div>
                <StatusBadge status={lead.status} />
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border bg-card/80 p-4 text-center backdrop-blur">
      <div className="font-mono text-2xl font-semibold">{value}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
