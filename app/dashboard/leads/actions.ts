'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireInstaller } from '@/lib/auth';

const statusSchema = z.enum(['NEW', 'VIEWED', 'PROPOSAL_SENT', 'CONVERTED', 'LOST']);

export async function updateLeadStatusAction(formData: FormData): Promise<void> {
  const { installer } = await requireInstaller();
  const id = String(formData.get('id') ?? '');
  const parsed = statusSchema.safeParse(formData.get('status'));
  if (!id || !parsed.success) return;

  await prisma.lead.updateMany({
    where: { id, installerId: installer.id },
    data: { status: parsed.data },
  });

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
