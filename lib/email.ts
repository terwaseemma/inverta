import 'server-only';

// Minimal Resend client via REST — no SDK dependency. Every send is
// best-effort: when RESEND_API_KEY is unset (local dev) we skip silently so
// features that *trigger* email still work end-to-end without it.
export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
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
      }),
    });
    return { sent: res.ok };
  } catch {
    // Email must never take down the request that triggered it.
    return { sent: false };
  }
}
