import 'server-only';

import { createClient } from '@supabase/supabase-js';

// Service-role client — bypasses RLS. Server-side ONLY: importing this from
// a client component will fail the build thanks to the 'server-only' guard.
// Use for privileged operations like storage writes on behalf of a verified
// user; always do your own authorization check before calling it.
export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      'Supabase admin client requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
    );
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
