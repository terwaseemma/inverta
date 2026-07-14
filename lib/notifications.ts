import 'server-only';

import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';
import { emailLayout, escapeHtml } from '@/lib/email-template';
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
  customerEmail?: string;
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
    // Replying to this notification goes straight to the customer.
    replyTo: params.customerEmail,
    html: emailLayout({
      heading: 'You have a new lead 🎉',
      bodyHtml: `
        <p><strong>${escapeHtml(customerName)}</strong> just used your solar calculator.</p>
        <p>System sizing: <strong>${escapeHtml(systemSummary)}</strong></p>
        <p>Their contact details and full requirements are waiting in your dashboard — leads answered within an hour close far more often.</p>
      `,
      cta: { label: 'Open the lead', url: `${appUrl}/dashboard/leads/${leadId}` },
    }),
  });
}

export async function notifyProposalViewed(params: {
  installerId: string;
  installerEmail?: string;
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

  if (params.installerEmail) {
    const appUrl = getAppUrl();
    await sendEmail({
      to: params.installerEmail,
      subject: `${params.customerName} just viewed your proposal`,
      html: emailLayout({
        heading: 'Your proposal was opened 👀',
        bodyHtml: `
          <p><strong>${escapeHtml(params.customerName)}</strong> just viewed the proposal you sent.</p>
          <p>This is the best moment to follow up — they're looking at your numbers right now.</p>
        `,
        cta: {
          label: 'View proposal',
          url: `${appUrl}/dashboard/proposals/${params.proposalId}`,
        },
      }),
    });
  }
}

// Sent once, right after the installer finishes onboarding.
export async function sendWelcomeEmail(params: {
  email: string;
  contactName: string;
  businessName: string;
  calcSlug: string;
}) {
  const appUrl = getAppUrl();
  const calcUrl = `${appUrl}/calc/${params.calcSlug}`;
  await sendEmail({
    to: params.email,
    subject: `${params.businessName} is live on Inverta ☀️`,
    html: emailLayout({
      heading: `Welcome, ${escapeHtml(params.contactName.split(' ')[0] ?? '')}!`,
      bodyHtml: `
        <p><strong>${escapeHtml(params.businessName)}</strong> is set up and your solar calculator is live:</p>
        <p><a href="${calcUrl}" style="color:#ff7a33;font-weight:600;">${calcUrl}</a></p>
        <p>Share that link on WhatsApp, Instagram, or flyers — every customer who fills it becomes a lead in your dashboard, and you can send them a branded PDF proposal in two clicks.</p>
      `,
      cta: { label: 'Go to your dashboard', url: `${appUrl}/dashboard` },
    }),
  });
}
