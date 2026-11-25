import Link from 'next/link';
import { ChevronRight, Inbox, X } from 'lucide-react';
import { requireOnboardedInstaller } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { LEAD_STATUS_LABELS, parseResultSnapshot, systemSummary } from '@/lib/lead-utils';
import { compactNaira, shortDate } from '@/lib/format';
import { EmptyState, PageHeader, PageShell } from '@/components/app/page';
import { cn } from '@/lib/utils';
import { StatusBadge } from './status-badge';

export const metadata = { title: 'Leads · Inverta' };

const STATUSES = ['NEW', 'VIEWED', 'PROPOSAL_SENT', 'CONVERTED', 'LOST'] as const;
type Status = (typeof STATUSES)[number];

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: { member?: string; status?: string };
}) {
  const { installer } = await requireOnboardedInstaller();

  // ?member=<id> narrows to one marketer's leads — linked from the Team page.
  // Resolved against this account so a foreign id simply matches nothing.
  const filterMember = searchParams.member
    ? await prisma.member.findFirst({
        where: { id: searchParams.member, installerId: installer.id },
        select: { id: true, name: true },
      })
    : null;
  const status = STATUSES.includes(searchParams.status as Status)
    ? (searchParams.status as Status)
    : null;

  const scope = {
    installerId: installer.id,
    ...(filterMember ? { sourcedByMemberId: filterMember.id } : {}),
  };

  const [leads, counts] = await Promise.all([
    prisma.lead.findMany({
      where: { ...scope, ...(status ? { status } : {}) },
      include: { sourcedBy: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    }),
    prisma.lead.groupBy({ by: ['status'], where: scope, _count: { _all: true } }),
  ]);

  const countOf = (s: string) => counts.find((c) => c.status === s)?._count._all ?? 0;
  const total = counts.reduce((n, c) => n + c._count._all, 0);

  // Filter links keep the other filter in place.
  const href = (nextStatus: string | null) => {
    const p = new URLSearchParams();
    if (filterMember) p.set('member', filterMember.id);
    if (nextStatus) p.set('status', nextStatus);
    const q = p.toString();
    return `/dashboard/leads${q ? `?${q}` : ''}`;
  };

  const filters: { key: string | null; label: string; n: number }[] = [
    { key: null, label: 'All', n: total },
    ...STATUSES.map((s) => ({ key: s as string, label: LEAD_STATUS_LABELS[s]!, n: countOf(s) })),
  ];

  return (
    <PageShell>
      <PageHeader
        title="Leads"
        lead="Every quote a customer requests through your calculator, with their contact and the system it sized."
      />

      {filterMember && (
        <Link href="/dashboard/leads" className="chip mb-4 h-9 bg-card px-3 text-[13px] hover:bg-secondary">
          Brought in by <span className="font-semibold">{filterMember.name}</span>
          <X className="h-3.5 w-3.5" aria-label="Clear filter" />
        </Link>
      )}

      {/* Status filter: one pill row, the current one in ink. */}
      <nav aria-label="Filter by status" className="-mx-1 mb-4 flex gap-1 overflow-x-auto px-1 pb-1">
        {filters.map((f) => {
          const current = status === f.key;
          return (
            <Link
              key={f.label}
              href={href(f.key)}
              aria-current={current ? 'page' : undefined}
              className={cn(
                'inline-flex h-9 shrink-0 items-center gap-2 rounded-full px-3.5 text-sm font-medium transition-colors',
                current
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:bg-card hover:text-foreground',
              )}
            >
              {f.label}
              <span className={cn('tabular-nums', current ? 'opacity-70' : '')}>{f.n}</span>
            </Link>
          );
        })}
      </nav>

      {leads.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={
            status
              ? `No ${LEAD_STATUS_LABELS[status]!.toLowerCase()} leads`
              : filterMember
                ? `No leads from ${filterMember.name} yet`
                : 'No leads yet'
          }
        >
          {status
            ? 'Leads move here as you work them.'
            : filterMember
              ? 'They appear as soon as a customer requests a quote through their link.'
              : 'Share your calculator link — every quote a customer requests shows up here instantly.'}
        </EmptyState>
      ) : (
        <ul className="card divide-y overflow-hidden">
          {leads.map((lead) => {
            const result = parseResultSnapshot(lead.resultSnapshot);
            const quoted = result.pricing?.totalKobo;
            return (
              <li key={lead.id}>
                <Link
                  href={`/dashboard/leads/${lead.id}`}
                  className="row-link flex items-center gap-4 px-5 py-4 sm:px-6"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-[15px] font-medium">{lead.customerName}</span>
                      {lead.sourcedBy && (
                        <span className="hidden shrink-0 text-[13px] text-muted-foreground sm:inline">
                          via {lead.sourcedBy.name.split(' ')[0]}
                        </span>
                      )}
                    </div>
                    <div className="truncate text-[13px] text-muted-foreground">
                      {systemSummary(result)}
                    </div>
                  </div>
                  <div className="hidden text-right md:block">
                    <div className="figure text-[15px]">{quoted ? compactNaira(quoted) : '—'}</div>
                    <div className="text-[13px] text-muted-foreground">{shortDate(lead.createdAt)}</div>
                  </div>
                  <div className="flex shrink-0 sm:w-[120px]"><StatusBadge status={lead.status} /></div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </PageShell>
  );
}
