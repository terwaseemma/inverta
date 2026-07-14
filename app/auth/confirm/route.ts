import { NextResponse, type NextRequest } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase/server';

// Email verification via token_hash — the link target used by our Supabase
// email templates ({{ .TokenHash }}). Unlike the default PKCE
// ConfirmationURL, token_hash verification works from ANY device/browser,
// not just the one that initiated signup — critical when someone signs up
// on desktop and opens the email on their phone.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const rawNext = searchParams.get('next') ?? '/onboarding';
  // Only allow same-site relative redirects.
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/onboarding';

  if (tokenHash && type) {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=verify_failed`);
}
