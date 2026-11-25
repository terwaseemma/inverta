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
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="page-title">Hi {member.name.split(' ')[0]}</h1>
      <p className="page-lead">Share your link — every quote requested through it is credited to you.</p>

      {/* The one job: share the link. It carries the page's accent. */}
      {myLink && calcLink?.isActive ? (
        <section className="mt-6 rounded-[24px] bg-primary p-6 text-primary-foreground sm:p-7">
          <div className="text-[13px] font-medium opacity-80">Your quote link</div>
          <div className="mt-2 truncate text-[17px] font-semibold">{myLink.replace(/^https?:\/\//, '')}</div>
          <div className="mt-5 flex gap-2">
            <a
              href={whatsappHref(
                `Thinking about solar? Get a free instant quote from ${installer.businessName} — see the system you need and the price in 2 minutes: ${myLink}`,
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="btn min-w-0 flex-1 bg-[hsl(24_40%_8%)] text-white hover:bg-[hsl(24_40%_14%)] sm:flex-none"
            >
              <MessageCircle className="h-4 w-4" /> Share on WhatsApp
            </a>
            <CopyLink url={myLink} className="h-11 shrink-0 border-transparent bg-white/90 px-5 text-[15px] text-[hsl(24_40%_8%)] hover:bg-white" />
          </div>
        </section>
      ) : (
        <section className="card mt-6 p-6">
          <h2 className="section-title">Nothing to share right now</h2>
          <p className="mt-1 text-[15px] text-muted-foreground">
            {installer.businessName}&apos;s calculator is switched off, so your link
            isn&apos;t live. Check back later.
          </p>
        </section>
      )}

      <div className="mt-4 grid grid-cols-3 gap-3">
        <Stat label="Leads" value={leads.length} />
        <Stat label="Proposal sent" value={inProgress} />
        <Stat label="Converted" value={converted} />
      </div>

      <section className="mt-8" aria-labelledby="mine">
        <h2 id="mine" className="section-title mb-3">
          Your leads
        </h2>
        {leads.length === 0 ? (
          <div className="card flex flex-col items-center px-6 py-12 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-secondary text-muted-foreground">
              <Inbox className="h-6 w-6" />
            </span>
            <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-muted-foreground">
              No leads yet. Every quote requested through your link lands here.
            </p>
          </div>
        ) : (
          <ul className="card divide-y overflow-hidden">
            {leads.map((lead) => (
              <li key={lead.id}>
                <Link href={`/team/leads/${lead.id}`} className="row-link flex items-center gap-3 px-5 py-4">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[15px] font-medium">{lead.customerName}</div>
                    <div className="truncate text-[13px] text-muted-foreground">
                      {systemSummary(parseResultSnapshot(lead.resultSnapshot))}
                    </div>
                  </div>
                  <div className="hidden text-[13px] text-muted-foreground sm:block">
                    {lead.createdAt.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', timeZone: 'Africa/Lagos' })}
                  </div>
                  <div className="flex shrink-0 sm:w-[120px]"><StatusBadge status={lead.status} /></div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card p-4 sm:p-5">
      <div className="figure text-[28px] leading-none">{value}</div>
      <div className="mt-2 text-[13px] text-muted-foreground">{label}</div>
    </div>
  );
}
