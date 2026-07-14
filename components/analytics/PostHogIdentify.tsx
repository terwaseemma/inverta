'use client';

import { useEffect } from 'react';
import posthog from 'posthog-js';

// Ties dashboard sessions to the installer so PostHog shows who did what
// instead of anonymous IDs. Mounted in the dashboard layout.
export function PostHogIdentify({
  installerId,
  email,
  businessName,
}: {
  installerId: string;
  email: string;
  businessName: string;
}) {
  useEffect(() => {
    if (!posthog.__loaded) return;
    if (posthog.get_distinct_id() !== installerId) {
      posthog.identify(installerId, { email, businessName });
    }
  }, [installerId, email, businessName]);

  return null;
}
