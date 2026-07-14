import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

const PROTECTED_PREFIXES = ['/dashboard', '/onboarding', '/admin'];
const AUTH_ROUTES = ['/login', '/signup'];

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const path = request.nextUrl.pathname;

  const isProtected = PROTECTED_PREFIXES.some((p) => path.startsWith(p));
  const isAuthRoute = AUTH_ROUTES.includes(path);

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', path);
    return NextResponse.redirect(url);
  }

  // Already-authenticated users hitting /login or /signup get sent home.
  if (isAuthRoute && user) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    // Run on every page request EXCEPT static files, _next internals, and the
    // public surfaces (calculator, storefront, customer proposal view, and
    // their API routes) — those don't need a session and skipping the
    // Supabase roundtrip keeps them fast.
    '/((?!_next/static|_next/image|favicon.ico|icon.png|wordmark.png|appliances/|calc/|store/|proposal/|installers|about|api/calc/|api/proposals/).*)',
  ],
};
