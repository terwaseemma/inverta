import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

// Supabase redirects users here after they click the verification link in
// their email. We exchange the one-time code for a session and forward them
// to the next stop (defaults to /onboarding).
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/onboarding';

  if (code) {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Code missing or invalid — bounce to login with a friendly notice.
  return NextResponse.redirect(`${origin}/login?error=verify_failed`);
}
