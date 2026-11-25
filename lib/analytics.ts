'use client';

import type { PostHog } from 'posthog-js';

// PostHog, loaded lazily: the library is a large script, and nothing on screen
// depends on it, so it downloads after the page is up instead of with every
// page's first JavaScript. Events go through our /ingest reverse proxy (see
// next.config.mjs) so ad-blockers don't drop them. With no key set (local
// dev), everything is a no-op.

let loading: Promise<PostHog | null> | null = null;

export function loadPostHog(): Promise<PostHog | null> {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key || typeof window === 'undefined') return Promise.resolve(null);
  if (!loading) {
    loading = import('posthog-js')
      .then(({ default: posthog }) => {
        if (!posthog.__loaded) {
          posthog.init(key, {
            api_host: '/ingest',
            ui_host:
              process.env.NEXT_PUBLIC_POSTHOG_HOST?.replace('.i.posthog.com', '.posthog.com') ??
              'https://us.posthog.com',
            // 2025 defaults: pageviews captured automatically on history
            // changes, so App Router navigations are tracked.
            defaults: '2025-05-24',
            capture_exceptions: true,
          });
        }
        return posthog;
      })
      .catch(() => {
        loading = null; // a blocked or failed download never breaks the page
        return null;
      });
  }
  return loading;
}

export type ClientEvent =
  // the public calculator
  | 'calculator_step_completed'
  | 'quote_failed'
  | 'quote_contact_clicked'
  // sharing a link from the dashboard or the marketer area
  | 'link_copied'
  | 'link_shared'
  // the customer's proposal and the storefront
  | 'proposal_accept_clicked'
  | 'proposal_pdf_downloaded'
  | 'store_enquiry_clicked'
  // sessions
  | 'signed_out';

/**
 * Record something the person did in the browser. Loads PostHog right away if
 * it isn't up yet, so a click before idle isn't lost. Properties never carry
 * a customer's name, phone or email.
 */
export function track(
  event: ClientEvent,
  properties?: Record<string, string | number | boolean | null | undefined>,
) {
  void loadPostHog().then((posthog) => posthog?.capture(event, properties));
}

/** On sign-out: forget who this was, so the next person isn't merged with them. */
export async function resetAnalytics() {
  // Never hold up signing out for analytics: give the script 1.5 s at most.
  const posthog = await Promise.race([
    loadPostHog(),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500)),
  ]);
  posthog?.capture('signed_out');
  posthog?.reset();
}

/** Run `fn` once the browser is idle (or after a short delay where unsupported). */
export function whenIdle(fn: () => void) {
  if (typeof window === 'undefined') return;
  const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
  if (w.requestIdleCallback) w.requestIdleCallback(fn, { timeout: 3000 });
  else setTimeout(fn, 1500);
}
