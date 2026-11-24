'use server';

import { randomBytes } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { memberCodeFrom, schemas } from '@inverta/shared';
import { prisma } from '@/lib/prisma';
import { requireOnboardedInstaller } from '@/lib/auth';
import { getAppUrl } from '@/lib/app-url';
import { sendTeamInviteEmail } from '@/lib/notifications';

export interface TeamFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: boolean;
  /** Returned on success so the owner can copy it — email may not be configured. */
  inviteUrl?: string;
  invitedName?: string;
}

const CODE_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'; // no 0/o/1/l/i

function randomSuffix(length = 4): string {
  const bytes = randomBytes(length);
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
}

// Invite a marketer onto this installer's account. Creates a pending seat with
// their own link code and a one-time token; the seat gets a login when they
// accept at /join/<token>.
export async function inviteMemberAction(
  _prev: TeamFormState,
  formData: FormData,
): Promise<TeamFormState> {
  const { installer } = await requireOnboardedInstaller();

  const parsed = schemas.memberInviteSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    phone: String(formData.get('phone') ?? '').trim() || undefined,
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? '');
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors };
  }
  const { name, email, phone } = parsed.data;

  // One email holds one login, and a login belongs to exactly one account.
  // Catch every way that could collide here, rather than at acceptance where
  // the marketer would hit a confusing Supabase error instead.
  const onThisTeam = await prisma.member.findUnique({
    where: { installerId_email: { installerId: installer.id, email } },
    select: { authUserId: true },
  });
  if (onThisTeam) {
    return {
      fieldErrors: {
        email: onThisTeam.authUserId
          ? 'This person is already on your team.'
          : 'Already invited — copy their invite link from the list below.',
      },
    };
  }

  const ownsAnAccount = await prisma.installer.findFirst({
    where: { email },
    select: { id: true },
  });
  if (ownsAnAccount) {
    return {
      fieldErrors: {
        email: 'This email already runs its own installer account on Inverta. Use a different email for them.',
      },
    };
  }

  const onAnotherTeam = await prisma.member.findFirst({
    where: { email, authUserId: { not: null } },
    select: { id: true },
  });
  if (onAnotherTeam) {
    return {
      fieldErrors: {
        email: "This email is already on another company's team. Use a different email for them.",
      },
    };
  }

  // Readable code, unique across the platform. Collisions are rare with a
  // 4-character suffix; retry a few times rather than assume.
  let code: string | null = null;
  for (let i = 0; i < 6 && !code; i++) {
    const candidate = memberCodeFrom(name, randomSuffix());
    const taken = await prisma.member.findUnique({ where: { code: candidate }, select: { id: true } });
    if (!taken) code = candidate;
  }
  if (!code) return { error: 'Could not create a link code — please try again.' };

  const inviteToken = randomBytes(24).toString('base64url');

  await prisma.member.create({
    data: {
      installerId: installer.id,
      email,
      name,
      phone,
      role: 'MARKETER',
      code,
      inviteToken,
    },
  });

  const inviteUrl = `${getAppUrl()}/join/${inviteToken}`;

  // Best-effort: the seat exists and the owner has the link either way.
  try {
    await sendTeamInviteEmail({
      to: email,
      name,
      businessName: installer.businessName,
      inviteUrl,
    });
  } catch (err) {
    console.error('[team] invite email failed:', err);
  }

  revalidatePath('/dashboard/team');
  return { success: true, inviteUrl, invitedName: name };
}

// Switch a marketer's access off or back on. Off means they cannot sign in to
// /team and their link stops crediting them — the calculator itself keeps
// working for any customer who still has it.
export async function setMemberActiveAction(formData: FormData): Promise<void> {
  const { installer } = await requireOnboardedInstaller();
  const id = String(formData.get('id') ?? '');
  const active = formData.get('active') === 'true';
  if (!id) return;

  await prisma.member.updateMany({
    // installerId scopes it to this account; role keeps an owner from ever
    // switching off their own seat through a crafted request.
    where: { id, installerId: installer.id, role: 'MARKETER' },
    data: { isActive: active },
  });
  revalidatePath('/dashboard/team');
}

// Withdraw an invite that has not been accepted yet. Accepted marketers are
// switched off instead — deleting them would orphan their login and drop the
// attribution on every lead they brought in.
export async function revokeInviteAction(formData: FormData): Promise<void> {
  const { installer } = await requireOnboardedInstaller();
  const id = String(formData.get('id') ?? '');
  if (!id) return;

  const pending = await prisma.member.findFirst({
    where: { id, installerId: installer.id, role: 'MARKETER', authUserId: null },
    select: { id: true, _count: { select: { leads: true } } },
  });
  if (!pending) return;

  if (pending._count.leads === 0) {
    await prisma.member.delete({ where: { id: pending.id } });
  } else {
    // Their link already brought in leads before they accepted. Deleting the
    // seat would strip that credit from every one of them, so kill the invite
    // and switch the seat off instead.
    await prisma.member.update({
      where: { id: pending.id },
      data: { inviteToken: null, isActive: false },
    });
  }
  revalidatePath('/dashboard/team');
}
