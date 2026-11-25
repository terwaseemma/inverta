'use client';

import { useEffect } from 'react';
import { loadPostHog } from '@/lib/analytics';

// Ties a signed-in session to a person so PostHog shows who did what instead
// of anonymous ids. Owners are identified by their installer id, the same id
// the server sends product events under (lib/analytics-server), so both land
// on one person; marketers by their own seat. Mounted in the dashboard and
// /team layouts. Waits for the lazily loaded client (lib/analytics).
export function PostHogIdentify({
  distinctId,
  properties,
}: {
  distinctId: string;
  properties: Record<string, string | number | boolean | null>;
}) {
  const key = JSON.stringify(properties);

  useEffect(() => {
    let cancelled = false;
    void loadPostHog().then((posthog) => {
      if (cancelled || !posthog) return;
      if (posthog.get_distinct_id() !== distinctId) {
        posthog.identify(distinctId, JSON.parse(key));
      } else {
        posthog.setPersonProperties(JSON.parse(key));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [distinctId, key]);

  return null;
}
