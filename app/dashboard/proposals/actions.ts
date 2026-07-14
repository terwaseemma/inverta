'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { schemas, nairaToKobo } from '@inverta/shared';
import { prisma } from '@/lib/prisma';
import { requireInstaller } from '@/lib/auth';
import { sendEmail } from '@/lib/email';
import { emailLayout, escapeHtml } from '@/lib/email-template';
import { getAppUrl } from '@/lib/app-url';
import { parseResultSnapshot } from '@/lib/lead-utils';

const PROPOSAL_VALIDITY_DAYS = 30;

// Build a draft proposal from the lead's frozen calculation snapshot.
// Whatever the snapshot priced becomes line items; anything unpriced is the
// installer's to fill in the editor.
export async function createProposalFromLeadAction(formData: FormData): Promise<void> {
  const { installer } = await requireInstaller();
  const leadId = String(formData.get('leadId') ?? '');
  if (!leadId) return;

  const lead = await prisma.lead.findFirst({
    where: { id: leadId, installerId: installer.id },
  });
  if (!lead) return;

  const r = parseResultSnapshot(lead.resultSnapshot);
  const items: {
    name: string;
    description?: string;
    quantity: number;
    unitPriceKobo: number;
    sortOrder: number;
  }[] = [];
  let order = 0;

  if (r.generator?.brand) {
    items.push({
      name: `${r.generator.brand} ${r.generator.model ?? ''}`.trim(),
      description: `All-in-one solar generator (${r.generator.capacityKva ?? '?'}kVA / ${r.generator.storageKwh ?? '?'}kWh)`,
      quantity: 1,
      unitPriceKobo: r.generator.priceKobo ?? 0,
      sortOrder: order++,
    });
  }
  if (r.inverter?.brand) {
    items.push({
      name: `${r.inverter.brand} ${r.inverter.model ?? ''}`.trim(),
      description: 'Inverter',
      quantity: 1,
      unitPriceKobo: r.inverter.priceKobo ?? 0,
      sortOrder: order++,
    });
  }
  if (r.batteries?.brand) {
    items.push({
      name: `${r.batteries.brand} ${r.batteries.model ?? ''}`.trim(),
      description: 'Battery',
      quantity: r.batteries.count ?? 1,
      unitPriceKobo: r.batteries.unitPriceKobo ?? 0,
      sortOrder: order++,
    });
  }
  if (r.panels?.brand) {
    items.push({
      name: `${r.panels.brand} ${r.panels.model ?? ''}`.trim(),
      description: 'Solar panel',
      quantity: r.panels.count ?? 1,
      unitPriceKobo: r.panels.unitPriceKobo ?? 0,
      sortOrder: order++,
    });
  }
  for (const acc of r.accessories ?? []) {
    items.push({
      name: acc.name ?? 'Accessory',
      quantity: acc.quantity ?? 1,
      unitPriceKobo: acc.unitPriceKobo ?? 0,
      sortOrder: order++,
    });
  }
  if (r.pricing?.installationFeeKobo != null) {
    items.push({
      name: 'Installation',
      quantity: 1,
      unitPriceKobo: r.pricing.installationFeeKobo,
      sortOrder: order++,
    });
  }
  if (items.length === 0) {
    // Sizing-only lead — start with an empty scaffold the installer fills in.
    items.push({
      name: 'Solar system (as specified)',
      description: 'Fill in components and pricing',
      quantity: 1,
      unitPriceKobo: 0,
      sortOrder: 0,
    });
  }

  const totalKobo = items.reduce((s, i) => s + i.quantity * i.unitPriceKobo, 0);
  const validUntil = new Date(Date.now() + PROPOSAL_VALIDITY_DAYS * 24 * 60 * 60 * 1000);

  const proposal = await prisma.proposal.create({
    data: {
      leadId: lead.id,
      installerId: installer.id,
      totalKobo,
      validUntil,
      items: { create: items },
    },
  });

  revalidatePath('/dashboard/proposals');
  revalidatePath(`/dashboard/leads/${lead.id}`);
  redirect(`/dashboard/proposals/${proposal.id}`);
}

export interface ProposalFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: boolean;
}

// The editor posts line items as JSON in a hidden field (dynamic row count
// doesn't map cleanly onto plain FormData).
export async function updateProposalAction(
  _prev: ProposalFormState,
  formData: FormData,
): Promise<ProposalFormState> {
  const { installer } = await requireInstaller();
  const id = String(formData.get('id') ?? '');
  if (!id) return { error: 'Missing proposal.' };

  let rawItems: unknown;
  try {
    rawItems = JSON.parse(String(formData.get('itemsJson') ?? '[]'));
  } catch {
    return { error: 'Could not read line items.' };
  }

  const parsed = schemas.proposalUpdateSchema.safeParse({
    customMessage: formData.get('customMessage') ?? '',
    items: rawItems,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid proposal.' };
  }

  const owned = await prisma.proposal.findFirst({
    where: { id, installerId: installer.id },
    select: { id: true },
  });
  if (!owned) return { error: 'Proposal not found.' };

  const items = parsed.data.items.map((item, i) => ({
    proposalId: id,
    name: item.name,
    description: item.description ?? null,
    quantity: item.quantity,
    unitPriceKobo: nairaToKobo(item.unitPriceNaira),
    sortOrder: i,
  }));
  const totalKobo = items.reduce((s, i) => s + i.quantity * i.unitPriceKobo, 0);

  await prisma.$transaction([
    prisma.proposalLineItem.deleteMany({ where: { proposalId: id } }),
    prisma.proposalLineItem.createMany({ data: items }),
    prisma.proposal.update({
      where: { id },
      data: { totalKobo, customMessage: parsed.data.customMessage ?? null },
    }),
  ]);

  revalidatePath(`/dashboard/proposals/${id}`);
  revalidatePath('/dashboard/proposals');
  return { success: true };
}

export async function sendProposalAction(formData: FormData): Promise<void> {
  const { installer } = await requireInstaller();
  const id = String(formData.get('id') ?? '');
  if (!id) return;

  const proposal = await prisma.proposal.findFirst({
    where: { id, installerId: installer.id },
    include: { lead: true },
  });
  if (!proposal) return;

  await prisma.$transaction([
    prisma.proposal.update({
      where: { id },
      data: { status: 'SENT', sentAt: new Date() },
    }),
    prisma.lead.update({
      where: { id: proposal.leadId },
      data: { status: 'PROPOSAL_SENT' },
    }),
  ]);

  // Customer email with the public capability link (cuid is unguessable).
  // Replies go to the installer, not the platform.
  const appUrl = getAppUrl();
  await sendEmail({
    to: proposal.lead.customerEmail,
    subject: `Your solar proposal from ${installer.businessName}`,
    replyTo: installer.email,
    html: emailLayout({
      heading: 'Your solar proposal is ready',
      bodyHtml: `
        <p>Hi ${escapeHtml(proposal.lead.customerName.split(' ')[0] ?? '')},</p>
        <p><strong>${escapeHtml(installer.businessName)}</strong> has prepared a solar system proposal for you, with a full cost breakdown and payment details.</p>
        <p>This quote is valid until <strong>${proposal.validUntil?.toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' }) ?? '30 days from now'}</strong>.</p>
      `,
      cta: { label: 'View your proposal', url: `${appUrl}/proposal/${proposal.id}` },
      footerNote: `Sent on behalf of ${escapeHtml(installer.businessName)} via Inverta. Reply to this email to reach them directly.`,
    }),
  });

  revalidatePath(`/dashboard/proposals/${id}`);
  revalidatePath('/dashboard/proposals');
  revalidatePath(`/dashboard/leads/${proposal.leadId}`);
  revalidatePath('/dashboard');
}

export async function deleteProposalAction(formData: FormData): Promise<void> {
  const { installer } = await requireInstaller();
  const id = String(formData.get('id') ?? '');
  if (!id) return;

  await prisma.proposal.deleteMany({ where: { id, installerId: installer.id } });
  revalidatePath('/dashboard/proposals');
  redirect('/dashboard/proposals');
}
