import 'server-only';

// Minimal Resend client via REST — no SDK dependency. Every send is
// best-effort: when RESEND_API_KEY is unset (local dev) we skip silently so
// features that *trigger* email still work end-to-end without it.
export async function sendEmail({
  to,
  subject,
  html,
  replyTo,
}: {
  to: string;
  subject: string;
  html: string;
  /** Replies go here instead of the from address — e.g. the installer, so a
   *  customer hitting Reply talks to their installer, not the platform. */
  replyTo?: string;
}): Promise<{ sent: boolean }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { sent: false };

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL ?? 'Inverta <onboarding@resend.dev>',
        to,
        subject,
        html,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
    });
    if (!res.ok) {
      // Log enough to debug bad domains/keys without leaking the payload.
      const body = await res.text().catch(() => '');
      console.error(`[email] Resend ${res.status} for "${subject}": ${body.slice(0, 300)}`);
    }
    return { sent: res.ok };
  } catch (err) {
    // Email must never take down the request that triggered it.
    console.error('[email] send failed:', err instanceof Error ? err.message : err);
    return { sent: false };
  }
}
