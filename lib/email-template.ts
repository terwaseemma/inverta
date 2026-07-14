import 'server-only';

// Branded HTML email layout. Inline styles only — email clients ignore
// stylesheets. Light background for readability everywhere; orange accents
// carry the brand.

const ORANGE = '#ff7a33';
const NAVY = '#16161f';

export function emailLayout({
  heading,
  bodyHtml,
  cta,
  footerNote,
}: {
  heading: string;
  /** Pre-escaped HTML — use escapeHtml() on all user-supplied values. */
  bodyHtml: string;
  cta?: { label: string; url: string };
  footerNote?: string;
}): string {
  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background-color:#f4f4f6;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:24px 16px;">
    <div style="padding:20px 24px;background-color:${NAVY};border-radius:10px 10px 0 0;">
      <span style="font-size:18px;font-weight:700;color:#ffffff;letter-spacing:0.5px;">
        Inverta<span style="color:${ORANGE};">.</span>app
      </span>
    </div>
    <div style="height:4px;background-color:${ORANGE};"></div>
    <div style="background-color:#ffffff;padding:28px 24px;border-radius:0 0 10px 10px;border:1px solid #e3e3e8;border-top:none;">
      <h1 style="margin:0 0 12px;font-size:19px;color:${NAVY};">${heading}</h1>
      <div style="font-size:14px;line-height:1.65;color:#3c3c46;">
        ${bodyHtml}
      </div>
      ${
        cta
          ? `<div style="margin-top:24px;">
        <a href="${cta.url}" style="display:inline-block;background-color:${ORANGE};color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:8px;">${cta.label}</a>
      </div>
      <p style="margin:16px 0 0;font-size:11px;color:#8a8a96;">Or copy this link: <a href="${cta.url}" style="color:${ORANGE};">${cta.url}</a></p>`
          : ''
      }
    </div>
    <p style="text-align:center;font-size:11px;color:#8a8a96;margin:16px 0 0;">
      ${footerNote ?? 'Sent by Inverta — solar quotation intelligence for installers.'}
    </p>
  </div>
</body>
</html>`;
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
