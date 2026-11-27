// The public origin for links that are fixed at build time, such as the
// landing page's link-preview image. The live site always uses the www host:
// the bare domain redirects to it, and WhatsApp drops a preview image behind a
// redirect. NEXT_PUBLIC_APP_URL is not trusted there, because a local value
// ("http://localhost:3000") copied into the host's settings once shipped
// previews pointing at localhost. Preview deploys use their own address.

const PRODUCTION_ORIGIN = 'https://www.inverta.app';

export function siteUrl(): string {
  if (process.env.VERCEL_ENV === 'production') return PRODUCTION_ORIGIN;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}
