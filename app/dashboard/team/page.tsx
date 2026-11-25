import Link from 'next/link';
import { MessageCircle } from 'lucide-react';
import { requireOnboardedInstaller } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getAppUrl } from '@/lib/app-url';
import { whatsappHref } from '@/lib/whatsapp';
import { cn } from '@/lib/utils';
import { PageHeader, PageShell } from '@/components/app/page';
import { CopyLink } from '../copy-button';
import { TrackedLink } from '@/components/analytics/TrackedLink';
import { InviteForm } from './team-forms';
import { revokeInviteAction, setMemberActiveAction } from './actions';

export const metadata = { title: 'Team · Inverta' };

type SeatState = 'owner' | 'active' | 'pending' | 'off' | 'withdrawn';

const SEAT_LABEL: Record<SeatState, string> = {
  owner: 'Owner',
  active: 'Active',
  pending: 'Invite pending',
  off: 'Access off',
  withdrawn: 'Invite withdrawn',
};

// Dot carries the state, the word stays in ink — same as lead badges.
const SEAT_DOT: Record<SeatState, string> = {
  owner: 'bg-foreground',
  active: 'bg-success',
  pending: 'bg-primary',
  off: 'bg-muted-foreground/50',
  withdrawn: 'bg-muted-foreground/30',
};

export default async function TeamPage() {
  const { installer } = await requireOnboardedInstaller();
  const appUrl = getAppUrl();

  const [calcLink, members, byStatus, ownLeads] = await Promise.all([
    prisma.calculatorLink.findUnique({
      where: { installerId: installer.id },
      select: { slug: true },
    }),
    prisma.member.findMany({
      where: { installerId: installer.id },
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
    }),
    // Leads per marketer per status, in one query.
    prisma.lead.groupBy({
      by: ['sourcedByMemberId', 'status'],
      where: { installerId: installer.id, sourcedByMemberId: { not: null } },
      _count: { _all: true },
    }),
    prisma.lead.count({
      where: { installerId: installer.id, sourcedByMemberId: null },
    }),
  ]);

  const stats = new Map<string, { leads: number; converted: number }>();
  for (const row of byStatus) {
    if (!row.sourcedByMemberId) continue;
    const s = stats.get(row.sourcedByMemberId) ?? { leads: 0, converted: 0 };
    s.leads += row._count._all;
    if (row.status === 'CONVERTED') s.converted += row._count._all;
    stats.set(row.sourcedByMemberId, s);
  }

  const marketerLink = (code: string | null) =>
    calcLink && code ? `${appUrl}/calc/${calcLink.slug}/m/${code}` : null;

  const seatState = (m: (typeof members)[number]): SeatState => {
    if (m.role === 'OWNER') return 'owner';
    if (!m.authUserId) return m.inviteToken ? (m.isActive ? 'pending' : 'off') : 'withdrawn';
    return m.isActive ? 'active' : 'off';
  };

  const marketers = members.filter((m) => m.role === 'MARKETER');

  return (
    <PageShell>
      <PageHeader
        title="Team"
        lead={`Invite marketers to sell for ${installer.businessName}. Each gets a calculator link that credits every quote to them, and sees only the leads they bring in — never your catalog, prices or settings.`}
      />

      <section className="card p-6" aria-labelledby="invite">
        <h2 id="invite" className="section-title mb-4">
          Invite a marketer
        </h2>
        <InviteForm businessName={installer.businessName} />
      </section>

      <section className="card mt-4" aria-labelledby="roster">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b px-6 py-5">
          <h2 id="roster" className="section-title">
            Your team
          </h2>
          <span className="text-[13px] text-muted-foreground">
            {marketers.length === 0
              ? 'no marketers yet'
              : `${marketers.length} marketer${marketers.length === 1 ? '' : 's'}`}
            {' · '}
            {ownLeads} lead{ownLeads === 1 ? '' : 's'} from your own link
          </span>
        </div>

        <div className="divide-y">
          {members.map((m) => {
            const state = seatState(m);
            const s = stats.get(m.id) ?? { leads: 0, converted: 0 };
            const link = marketerLink(m.code);
            const inviteUrl = m.inviteToken ? `${appUrl}/join/${m.inviteToken}` : null;

            return (
              <div key={m.id} className="space-y-3 px-6 py-5">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="min-w-[180px] flex-1">
                    <div className="flex items-center gap-2 text-[15px] font-medium">
                      {m.name}
                      <span className="chip bg-card font-medium text-foreground">
                        <span aria-hidden className={cn('h-1.5 w-1.5 rounded-full', SEAT_DOT[state])} />
                        {SEAT_LABEL[state]}
                      </span>
                    </div>
                    <div className="text-[13px] text-muted-foreground">
                      {m.email}
                      {m.phone ? ` · ${m.phone}` : ''}
                    </div>
                  </div>

                  {m.role === 'MARKETER' && (
                    <Link
                      href={`/dashboard/leads?member=${m.id}`}
                      className="text-[13px] text-muted-foreground hover:text-foreground"
                    >
                      <span className="figure text-foreground">{s.leads}</span> lead
                      {s.leads === 1 ? '' : 's'} ·{' '}
                      <span className="figure text-foreground">{s.converted}</span> converted
                    </Link>
                  )}

                  {state === 'pending' && (
                    <form action={revokeInviteAction}>
                      <input type="hidden" name="id" value={m.id} />
                      <SmallButton>Withdraw invite</SmallButton>
                    </form>
                  )}
                  {(state === 'active' || (state === 'off' && m.authUserId)) && (
                    <form action={setMemberActiveAction}>
                      <input type="hidden" name="id" value={m.id} />
                      <input type="hidden" name="active" value={state === 'active' ? 'false' : 'true'} />
                      <SmallButton>{state === 'active' ? 'Switch off access' : 'Restore access'}</SmallButton>
                    </form>
                  )}
                </div>

                {state === 'pending' && inviteUrl && (
                  <LinkRow
                    label="Invite link"
                    url={inviteUrl}
                    whatsapp={`Hi ${m.name.split(' ')[0]}, join the ${installer.businessName} sales team on Inverta and get your own solar quote link: ${inviteUrl}`}
                  />
                )}
                {m.role === 'MARKETER' && link && (state === 'active' || state === 'pending') && (
                  <LinkRow label="Their calculator link" url={link} />
                )}
              </div>
            );
          })}
        </div>
      </section>
    </PageShell>
  );
}

function LinkRow({ label, url, whatsapp }: { label: string; url: string; whatsapp?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-[13px]">
      <span className="text-muted-foreground">{label}</span>
      <code className="min-w-0 flex-1 truncate rounded-lg bg-secondary px-2 py-1 font-mono">
        {url}
      </code>
      <CopyLink url={url} what="marketer_link" />
      {whatsapp && (
        <TrackedLink
          event="link_shared"
          eventProps={{ what: 'marketer_link', channel: 'whatsapp', by: 'owner' }}
          href={whatsappHref(whatsapp)}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-secondary btn-sm"
        >
          <MessageCircle className="h-3 w-3" /> WhatsApp
        </TrackedLink>
      )}
    </div>
  );
}

function SmallButton({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="submit"
      className="btn btn-secondary btn-sm"
    >
      {children}
    </button>
  );
}
