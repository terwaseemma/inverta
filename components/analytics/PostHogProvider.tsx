'use client';

import { useEffect } from 'react';
import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';

// Initializes PostHog once on the client. Events go through our /ingest
// reverse proxy (see next.config.mjs) so ad-blockers don't drop them.
// With no key set (local dev), everything silently no-ops.
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key || posthog.__loaded) return;
    posthog.init(key, {
      api_host: '/ingest',
      ui_host: process.env.NEXT_PUBLIC_POSTHOG_HOST?.replace('.i.posthog.com', '.posthog.com') ??
        'https://us.posthog.com',
      // 2025 defaults: pageviews captured automatically on history changes,
      // so App Router navigations are tracked without a manual component.
      defaults: '2025-05-24',
      capture_exceptions: true,
    });
  }, []);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
