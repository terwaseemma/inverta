'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireInstaller } from '@/lib/auth';
import { captureServer, nairaBand } from '@/lib/analytics-server';
import { parseResultSnapshot } from '@/lib/lead-utils';

const statusSchema = z.enum(['NEW', 'VIEWED', 'PROPOSAL_SENT', 'CONVERTED', 'LOST']);

export async function updateLeadStatusAction(formData: FormData): Promise<void> {
  const { installer } = await requireInstaller();
  const id = String(formData.get('id') ?? '');
  const parsed = statusSchema.safeParse(formData.get('status'));
  if (!id || !parsed.success) return;

  const before = await prisma.lead.findFirst({
    where: { id, installerId: installer.id },
    select: { status: true, resultSnapshot: true, sourcedByMemberId: true },
  });
  if (!before) return;

  await prisma.lead.updateMany({
    where: { id, installerId: installer.id },
    data: { status: parsed.data },
  });

  if (before.status !== parsed.data) {
    await captureServer('lead_status_changed', installer.id, {
      from: before.status.toLowerCase(),
      to: parsed.data.toLowerCase(),
      via_marketer: Boolean(before.sourcedByMemberId),
      price_naira_band: nairaBand(parseResultSnapshot(before.resultSnapshot).pricing?.totalKobo),
    });
  }

  revalidatePath('/dashboard/leads');
  revalidatePath(`/dashboard/leads/${id}`);
  revalidatePath('/dashboard');
}

export interface NotesFormState {
  error?: string;
  success?: boolean;
}

export async function saveLeadNotesAction(
  _prev: NotesFormState,
  formData: FormData,
): Promise<NotesFormState> {
  const { installer } = await requireInstaller();
  const id = String(formData.get('id') ?? '');
  const notes = String(formData.get('notes') ?? '').slice(0, 2000);
  if (!id) return { error: 'Missing lead.' };

  const { count } = await prisma.lead.updateMany({
    where: { id, installerId: installer.id },
    data: { notes: notes || null },
  });
  if (count === 0) return { error: 'Lead not found.' };

  revalidatePath(`/dashboard/leads/${id}`);
  return { success: true };
}
