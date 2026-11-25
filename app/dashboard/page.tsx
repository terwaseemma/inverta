import Link from 'next/link';
import { ArrowUpRight, Inbox, MessageCircle, PackageOpen } from 'lucide-react';
import { requireOnboardedInstaller } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getAppUrl } from '@/lib/app-url';
import { whatsappHref } from '@/lib/whatsapp';
import { parseResultSnapshot, systemSummary } from '@/lib/lead-utils';
import { compactNaira, lagosDayKey, lagosHour, relativeTime, shortDate } from '@/lib/format';
import { PageShell } from '@/components/app/page';
import { cn } from '@/lib/utils';
import { CopyLink } from './copy-button';
import { TrackedLink } from '@/components/analytics/TrackedLink';
import { StatusBadge } from './leads/status-badge';

export const metadata = { title: 'Dashboard · Inverta' };

const OPEN = new Set(['NEW', 'VIEWED', 'PROPOSAL_SENT']);
const DAYS = 30;

export default async function DashboardOverviewPage() {
  const { installer } = await requireOnboardedInstaller();
  const now = new Date();

  const [leads, calcLink, catalogTypes, notifications] = await Promise.all([
    prisma.lead.findMany({
      where: { installerId: installer.id },
      select: {
        id: true,
        customerName: true,
        status: true,
        createdAt: true,
        resultSnapshot: true,
        sourcedBy: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 1000,
    }),
    prisma.calculatorLink.findUnique({ where: { installerId: installer.id } }),
    prisma.catalogItem.groupBy({
      by: ['type'],
      where: { installerId: installer.id, isActive: true },
    }),
    prisma.notification.findMany({
      where: { installerId: installer.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ]);

  // Show unread once, then mark read.
  const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
  if (unreadIds.length > 0) {
    await prisma.notification.updateMany({
      where: { id: { in: unreadIds } },
      data: { read: true },
    });
  }

  // ── Figures, all from real leads ──────────────────────────────────────
  const quoted = (l: (typeof leads)[number]) =>
    parseResultSnapshot(l.resultSnapshot).pricing?.totalKobo ?? 0;

  const monthKey = lagosDayKey(now).slice(0, 7);
  const prevMonth = new Date(now);
  prevMonth.setUTCDate(1);
  prevMonth.setUTCMonth(prevMonth.getUTCMonth() - 1);
  const prevMonthKey = lagosDayKey(prevMonth).slice(0, 7);

  const thisMonth = leads.filter((l) => lagosDayKey(l.createdAt).startsWith(monthKey)).length;
  const lastMonth = leads.filter((l) => lagosDayKey(l.createdAt).startsWith(prevMonthKey)).length;

  const open = leads.filter((l) => OPEN.has(l.status));
  const pipelineKobo = open.reduce((s, l) => s + quoted(l), 0);
  const won = leads.filter((l) => l.status === 'CONVERTED');
  const wonKobo = won.reduce((s, l) => s + quoted(l), 0);
  // Of the leads that reached an outcome, how many were won. A lead still in
  // play is neither, so it does not drag the rate down.
  const decided = won.length + leads.filter((l) => l.status === 'LOST').length;
  const winRate = decided > 0 ? Math.round((won.length / decided) * 100) : null;

  // Leads per day, last 30 days, in Lagos time.
  const series: { key: string; date: Date; count: number }[] = [];
  for (let i = DAYS - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    series.push({ key: lagosDayKey(d), date: d, count: 0 });
  }
  const byKey = new Map(series.map((s) => [s.key, s]));
  for (const l of leads) {
    const day = byKey.get(lagosDayKey(l.createdAt));
    if (day) day.count++;
  }
  const last30 = series.reduce((s, d) => s + d.count, 0);

  const statusCounts = (['NEW', 'VIEWED', 'PROPOSAL_SENT', 'CONVERTED', 'LOST'] as const).map((s) => ({
    status: s,
    count: leads.filter((l) => l.status === s).length,
  }));

  const stocked = new Set(catalogTypes.map((c) => c.type));
  const catalogIncomplete = !(
    stocked.has('PANEL') &&
    ((stocked.has('INVERTER') && stocked.has('BATTERY')) || stocked.has('GENERATOR'))
  );

  const calcUrl = calcLink ? `${getAppUrl()}/calc/${calcLink.slug}` : null;
  const firstName = installer.contactName.split(' ')[0];
  const hour = lagosHour(now);
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <PageShell width="wide">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4 lg:mb-8">
        <div>
          <h1 className="page-title">
            {greeting}, {firstName}
          </h1>
          <p className="page-lead">
            How {installer.businessName}&apos;s calculator is selling.
          </p>
        </div>
        <Link href="/dashboard/leads" className="btn btn-secondary">
          <Inbox className="h-4 w-4" /> Open leads
        </Link>
      </header>

      {catalogIncomplete && (
        <div className="card mb-4 flex flex-wrap items-center gap-4 p-5">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-link">
            <PackageOpen className="h-5 w-5" />
          </span>
          <div className="min-w-[220px] flex-1">
            <div className="text-[15px] font-semibold">Customers see sizing, not prices</div>
            <p className="text-[15px] text-muted-foreground">
              Stock panels plus an inverter and battery, or an all-in-one, and every quote
              gets a real total.
            </p>
          </div>
          <Link href="/dashboard/catalog" className="btn btn-primary">
            Set up catalog
          </Link>
        </div>
      )}

      {/* ── Row 1: four figures, the calculator card carrying the accent ── */}
      {/* Phone: the trend card and the link card span the row; the two money
          figures sit side by side. sm: two by two. xl: one row. */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4 [&>*]:min-w-0">
        <Figure
          className="col-span-2 sm:col-span-1"
          label="Leads this month"
          value={thisMonth.toString()}
          note={
            lastMonth === 0
              ? thisMonth === 0
                ? 'None yet this month'
                : 'None last month'
              : `${thisMonth >= lastMonth ? '+' : '−'}${Math.abs(thisMonth - lastMonth)} on last month`
          }
          visual={<MiniBars values={series.slice(-14).map((d) => d.count)} />}
        />
        <Figure
          label="Open pipeline"
          value={compactNaira(pipelineKobo)}
          note={`${open.length} quote${open.length === 1 ? '' : 's'} in play`}
        />
        <Figure
          label="Converted"
          value={compactNaira(wonKobo)}
          note={
            winRate === null
              ? 'No decided leads yet'
              : `${won.length} lead${won.length === 1 ? '' : 's'} · ${winRate}% of decided`
          }
        />
        {calcUrl && calcLink ? (
          <CalculatorCard url={calcUrl} slug={calcLink.slug} businessName={installer.businessName} />
        ) : (
          <Figure className="col-span-2 sm:col-span-1" label="Calculator" value="Off" note="No calculator link yet" />
        )}
      </div>

      {/* ── Row 2: the month's flow and where leads stand ── */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3 [&>*]:min-w-0">
        <section className="card p-6 lg:col-span-2" aria-labelledby="flow">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="flow" className="section-title">
              Leads, last 30 days
            </h2>
            <span className="text-[15px] text-muted-foreground">
              <span className="figure text-foreground">{last30}</span> total
            </span>
          </div>
          <LeadsChart series={series} />
        </section>

        <section className="card p-6" aria-labelledby="stages">
          <h2 id="stages" className="section-title">
            Where leads stand
          </h2>
          <Stages counts={statusCounts} total={leads.length} />
        </section>
      </div>

      {/* ── Row 3: who came in, and what happened ── */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3 [&>*]:min-w-0">
        <section className="card lg:col-span-2" aria-labelledby="recent">
          <div className="flex items-center justify-between px-6 pb-2 pt-6">
            <h2 id="recent" className="section-title">
              Latest leads
            </h2>
            <Link href="/dashboard/leads" className="link text-sm font-medium">
              See all
            </Link>
          </div>
          {leads.length === 0 ? (
            <p className="px-6 pb-6 text-[15px] text-muted-foreground">
              Share your calculator link — every quote a customer requests lands here.
            </p>
          ) : (
            <ul className="pb-2">
              {leads.slice(0, 5).map((l) => (
                <li key={l.id}>
                  <Link
                    href={`/dashboard/leads/${l.id}`}
                    className="row-link flex items-center gap-4 px-6 py-3"
                  >
                    <Avatar name={l.customerName} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[15px] font-medium">{l.customerName}</div>
                      <div className="truncate text-[13px] text-muted-foreground">
                        {systemSummary(parseResultSnapshot(l.resultSnapshot))}
                        {l.sourcedBy ? ` · via ${l.sourcedBy.name.split(' ')[0]}` : ''}
                      </div>
                    </div>
                    <div className="hidden text-right sm:block">
                      <div className="figure text-[15px]">
                        {quoted(l) ? compactNaira(quoted(l)) : '—'}
                      </div>
                      <div className="text-[13px] text-muted-foreground">{shortDate(l.createdAt)}</div>
                    </div>
                    <div className="flex shrink-0 sm:w-[120px]"><StatusBadge status={l.status} /></div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-6" aria-labelledby="activity">
          <h2 id="activity" className="section-title">
            Activity
          </h2>
          {notifications.length === 0 ? (
            <p className="mt-2 text-[15px] text-muted-foreground">
              New leads and opened proposals show up here.
            </p>
          ) : (
            <ol className="mt-4 space-y-4">
              {notifications.map((n) => {
                const body = (
                  <div className="flex gap-3">
                    <span
                      aria-hidden
                      className={cn(
                        'mt-[7px] h-2 w-2 shrink-0 rounded-full',
                        unreadIds.includes(n.id) ? 'bg-primary' : 'bg-border',
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[15px] font-medium leading-snug">{n.title}</div>
                      <div className="mt-0.5 truncate text-[13px] leading-snug text-muted-foreground">
                        {n.message}
                      </div>
                      <div className="mt-1 text-[13px] text-muted-foreground">
                        {relativeTime(n.createdAt, now)}
                      </div>
                    </div>
                  </div>
                );
                return (
                  <li key={n.id}>
                    {n.linkUrl ? (
                      <Link href={n.linkUrl} className="-m-2 block rounded-xl p-2 transition-colors hover:bg-secondary">
                        {body}
                      </Link>
                    ) : (
                      body
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </div>
    </PageShell>
  );
}

// ── Pieces ───────────────────────────────────────────────────────────────

function Figure({
  label,
  value,
  note,
  visual,
  className,
}: {
  className?: string;
  label: string;
  value: string;
  note: string;
  visual?: React.ReactNode;
}) {
  return (
    <div className={cn('card flex min-h-[132px] flex-col justify-between p-5 sm:min-h-[148px] sm:p-6', className)}>
      <div className="label">{label}</div>
      <div className="mt-4 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="figure text-[26px] leading-none sm:text-[32px]">{value}</div>
          <div className="mt-2 text-[13px] text-muted-foreground">{note}</div>
        </div>
        {visual}
      </div>
    </div>
  );
}

// Fourteen days as small bars — the "spent this month" glance from the
// reference, but each bar is a real day's leads.
function MiniBars({ values }: { values: number[] }) {
  const max = Math.max(1, ...values);
  return (
    <div className="flex h-12 items-end gap-[3px]" role="img" aria-label="Leads per day, last 14 days">
      {values.map((v, i) => (
        <span
          key={i}
          className={cn(
            'w-[5px] rounded-full',
            i === values.length - 1 ? 'bg-primary' : 'bg-foreground/15',
          )}
          style={{ height: `${Math.max(12, (v / max) * 100)}%` }}
        />
      ))}
    </div>
  );
}

// The one accent card: the installer's link, ready to send. Ink on orange
// for contrast (white on this orange reads at 2.5:1).
function CalculatorCard({
  url,
  slug,
  businessName,
}: {
  url: string;
  slug: string;
  businessName: string;
}) {
  return (
    <div className="col-span-2 flex min-h-[132px] flex-col justify-between rounded-[20px] bg-primary p-5 text-primary-foreground sm:col-span-1 sm:min-h-[148px] sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[13px] font-medium opacity-80">Your calculator</span>
        <Link
          href={`/calc/${slug}`}
          target="_blank"
          className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[13px] font-medium hover:bg-black/10"
        >
          Open <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <div className="mt-3 truncate text-[15px] font-medium">{url.replace(/^https?:\/\//, '')}</div>
      <div className="mt-3 flex gap-2">
        <CopyLink url={url} what="calculator" className="border-transparent bg-white/90 text-[hsl(24_40%_8%)] hover:bg-white" />
        <TrackedLink
          event="link_shared"
          eventProps={{ what: 'calculator', channel: 'whatsapp' }}
          href={whatsappHref(
            `Get a free instant solar quote from ${businessName} — see the system you need and the price in 2 minutes: ${url}`,
          )}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-sm bg-[hsl(24_40%_8%)] text-white hover:bg-[hsl(24_40%_14%)]"
        >
          <MessageCircle className="h-3.5 w-3.5" /> Share
        </TrackedLink>
      </div>
    </div>
  );
}

function LeadsChart({ series }: { series: { key: string; date: Date; count: number }[] }) {
  const max = Math.max(1, ...series.map((s) => s.count));
  const total = series.reduce((s, d) => s + d.count, 0);
  const label = `Leads per day over the last 30 days: ${total} in total, at most ${max} in a day.`;
  return (
    <div className="mt-6">
      <div className="relative">
        {/* Two quiet guide lines: the peak and the floor. */}
        <div className="pointer-events-none absolute inset-x-0 top-0 border-t border-dashed" aria-hidden />
        <span className="absolute -top-2.5 right-0 bg-card pl-2 text-[13px] text-muted-foreground" aria-hidden>
          {max}
        </span>
        <div className="flex h-44 items-end gap-[3px] pt-4" role="img" aria-label={label}>
          {series.map((d, i) => (
            <div key={d.key} className="group relative flex h-full flex-1 items-end">
              <span
                className={cn(
                  'w-full rounded-t-[4px] transition-colors',
                  d.count === 0
                    ? 'h-[3px] bg-foreground/10'
                    : i === series.length - 1
                      ? 'bg-primary'
                      : 'bg-foreground/80 group-hover:bg-primary',
                )}
                style={d.count ? { height: `${(d.count / max) * 100}%` } : undefined}
              />
              <span className="pointer-events-none absolute bottom-full left-1/2 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-foreground px-2 py-1 text-[12px] font-medium text-background group-hover:block">
                {d.count} · {shortDate(d.date)}
              </span>
            </div>
          ))}
        </div>
        <div className="border-t" aria-hidden />
      </div>
      <div className="mt-2 flex justify-between text-[13px] text-muted-foreground" aria-hidden>
        <span>{shortDate(series[0]!.date)}</span>
        <span>{shortDate(series[Math.floor(series.length / 2)]!.date)}</span>
        <span>Today</span>
      </div>
    </div>
  );
}

const STAGE_LABEL: Record<string, string> = {
  NEW: 'New',
  VIEWED: 'Viewed',
  PROPOSAL_SENT: 'Proposal sent',
  CONVERTED: 'Converted',
  LOST: 'Lost',
};

function Stages({ counts, total }: { counts: { status: string; count: number }[]; total: number }) {
  return (
    <ul className="mt-5 space-y-4">
      {counts.map(({ status, count }) => (
        <li key={status}>
          <div className="flex items-baseline justify-between text-[15px]">
            <span>{STAGE_LABEL[status]}</span>
            <span className="figure">{count}</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-secondary">
            <div
              className={cn(
                'h-full rounded-full',
                status === 'CONVERTED' ? 'bg-primary' : status === 'LOST' ? 'bg-foreground/25' : 'bg-foreground/70',
              )}
              style={{ width: total ? `${(count / total) * 100}%` : '0%' }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
  return (
    <span
      aria-hidden
      className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-secondary text-[13px] font-semibold text-muted-foreground"
    >
      {initials || '?'}
    </span>
  );
}
