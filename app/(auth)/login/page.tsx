import Link from 'next/link';
import { LoginForm } from './login-form';

export const metadata = { title: 'Sign in · Inverta' };

export default function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string; error?: string };
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sign in to manage your leads and proposals.
        </p>
      </div>
      {searchParams.error === 'verify_failed' && (
        <div className="rounded-md border border-accent/40 bg-accent/10 p-3 text-sm">
          That verification link has expired or was already used. Sign in below — if
          your email isn&apos;t confirmed yet, we&apos;ll send you a fresh link.
        </div>
      )}
      <LoginForm next={searchParams.next} />
      <p className="text-center text-sm text-muted-foreground">
        New here?{' '}
        <Link href="/signup" className="orange-text hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
