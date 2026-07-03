'use client';

import { createBrowserClient } from '@supabase/ssr';

// For Client Components — uses the browser's cookie store automatically.
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
