import 'server-only';

import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';
import { getAppUrl } from '@/lib/app-url';

// Fire-and-forget installer notifications: always writes the in-app row,
// sends email only when Resend is configured. Callers should not await
// failures — wrap in try/catch and move on.

export async function notifyNewLead(params: {
  installerId: string;
  installerEmail: string;
  installerName: string;
  leadId: string;
  customerName: string;
  systemSummary: string;
}) {
  const { installerId, installerEmail, leadId, customerName, systemSummary } = params;

  await prisma.notification.create({
    data: {
      installerId,
      type: 'NEW_LEAD',
      title: 'New lead from your calculator',
      message: `${customerName} requested a quote — ${systemSummary}`,
      linkUrl: `/dashboard/leads/${leadId}`,
    },
  });

  const appUrl = getAppUrl();
  await sendEmail({
    to: installerEmail,
    subject: `New solar lead: ${customerName}`,
    html: `
      <p>You have a new lead from your Inverta calculator.</p>
      <p><strong>${escapeHtml(customerName)}</strong> — ${escapeHtml(systemSummary)}</p>
      <p><a href="${appUrl}/dashboard/leads/${leadId}">Open the lead in your dashboard</a></p>
    `,
  });
}

export async function notifyProposalViewed(params: {
  installerId: string;
  proposalId: string;
  customerName: string;
}) {
  await prisma.notification.create({
    data: {
      installerId: params.installerId,
      type: 'PROPOSAL_VIEWED',
      title: 'Proposal viewed',
      message: `${params.customerName} opened your proposal.`,
      linkUrl: `/dashboard/proposals/${params.proposalId}`,
    },
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
