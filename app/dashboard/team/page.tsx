import Link from 'next/link';
import { MessageCircle, UsersRound } from 'lucide-react';
import { requireOnboardedInstaller } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getAppUrl } from '@/lib/app-url';
import { whatsappHref } from '@/lib/whatsapp';
import { cn } from '@/lib/utils';
import { CopyLink } from '../copy-button';
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

const SEAT_STYLE: Record<SeatState, string> = {
  owner: 'bg-primary/15 text-primary border-primary/30',
  active: 'bg-green-500/15 text-green-500 border-green-500/30',
  pending: 'bg-accent/15 text-accent border-accent/30',
  off: 'bg-secondary text-secondary-foreground border-border',
  withdrawn: 'bg-secondary text-muted-foreground border-border',
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
    <div className="container max-w-4xl py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Team</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Invite marketers to sell for {installer.businessName}. Each gets their own
          calculator link — every quote through it is credited to them, and they see
          only the leads they brought in. Your catalog, prices and settings stay
          private.
        </p>
      </div>

      <section className="rounded-xl border bg-card/80 p-6 backdrop-blur">
        <h2 className="mb-4 font-semibold">Invite a marketer</h2>
        <InviteForm businessName={installer.businessName} />
      </section>

      <section className="mt-8 rounded-xl border bg-card/80 backdrop-blur">
        <div className="flex flex-wrap items-center gap-2 border-b px-5 py-3">
          <UsersRound className="h-4 w-4 text-primary" />
          <h2 className="font-semibold">Your team</h2>
          <span className="text-xs text-muted-foreground">
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
              <div key={m.id} className="space-y-3 px-5 py-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="min-w-[180px] flex-1">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      {m.name}
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium',
                          SEAT_STYLE[state],
                        )}
                      >
                        {SEAT_LABEL[state]}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {m.email}
                      {m.phone ? ` · ${m.phone}` : ''}
                    </div>
                  </div>

                  {m.role === 'MARKETER' && (
                    <Link
                      href={`/dashboard/leads?member=${m.id}`}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      <span className="font-mono text-foreground">{s.leads}</span> lead
                      {s.leads === 1 ? '' : 's'} ·{' '}
                      <span className="font-mono text-foreground">{s.converted}</span> converted
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
    </div>
  );
}

function LinkRow({ label, url, whatsapp }: { label: string; url: string; whatsapp?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <code className="min-w-0 flex-1 truncate rounded bg-background/60 px-2 py-1 font-mono">
        {url}
      </code>
      <CopyLink url={url} />
      {whatsapp && (
        <a
          href={whatsappHref(whatsapp)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-md border bg-background px-2.5 py-1 text-xs font-medium hover:bg-muted"
        >
          <MessageCircle className="h-3 w-3" /> WhatsApp
        </a>
      )}
    </div>
  );
}

function SmallButton({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="submit"
      className="inline-flex h-8 items-center rounded-md border bg-background/40 px-3 text-xs font-medium backdrop-blur transition-colors hover:bg-secondary"
    >
      {children}
    </button>
  );
}
