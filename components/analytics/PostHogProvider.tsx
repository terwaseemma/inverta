'use client';

import { useEffect } from 'react';
import { loadPostHog, whenIdle } from '@/lib/analytics';

// Starts PostHog once the page is idle, so its script never competes with
// the page itself (see lib/analytics). With no key set, it does nothing.
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    whenIdle(() => void loadPostHog());
  }, []);

  return <>{children}</>;
}
