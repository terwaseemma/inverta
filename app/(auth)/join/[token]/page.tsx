import Link from 'next/link';
import { UsersRound } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { JoinForm } from './join-form';

export const metadata = { title: 'Join a team · Inverta' };
export const dynamic = 'force-dynamic';

export default async function JoinPage({ params }: { params: { token: string } }) {
  const seat = await prisma.member.findUnique({
    where: { inviteToken: params.token },
    select: {
      name: true,
      email: true,
      authUserId: true,
      isActive: true,
      installer: { select: { businessName: true } },
    },
  });

  if (!seat || seat.authUserId || !seat.isActive) {
    return (
      <div className="space-y-4 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Invite not valid</h1>
        <p className="text-sm text-muted-foreground">
          This link has already been used or was withdrawn. If you already joined,
          sign in. Otherwise ask the company for a new invite.
        </p>
        <Link href="/login" className="orange-text text-sm hover:underline">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary/15 text-primary">
          <UsersRound className="h-7 w-7" />
        </div>
        <h1 className="mt-4 text-2xl font-bold tracking-tight">
          Join {seat.installer.businessName}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Hi {seat.name.split(' ')[0]} — set a password to get your own solar quote
          link. Every customer who requests a quote through it is credited to you.
        </p>
      </div>
      <JoinForm token={params.token} email={seat.email} />
    </div>
  );
}
