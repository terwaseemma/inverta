import 'server-only';

import { headers } from 'next/headers';

// Resolve the app's public origin from the incoming request, so links are
// correct on any domain (inverta.app, Vercel previews, localhost) without
// depending on a build-time env var. Falls back to NEXT_PUBLIC_APP_URL for
// contexts with no request headers.
//
// Works in Server Components, Server Actions, and Route Handlers.
export function getAppUrl(): string {
  try {
    const h = headers();
    const host = h.get('x-forwarded-host') ?? h.get('host');
    if (host) {
      const proto =
        h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
      return `${proto}://${host}`;
    }
  } catch {
    // headers() throws outside a request scope — fall through to env.
  }
  return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
}
