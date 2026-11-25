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
        <h1 className="text-[26px] font-semibold tracking-[-0.02em]">Welcome back</h1>
        <p className="mt-1 text-[15px] leading-relaxed text-muted-foreground">
          Sign in to manage your leads and proposals.
        </p>
      </div>
      {searchParams.error === 'verify_failed' && (
        <div className="rounded-xl p-3 text-sm bg-secondary">
          That verification link has expired or was already used. Sign in below — if
          your email isn&apos;t confirmed yet, we&apos;ll send you a fresh link.
        </div>
      )}
      <LoginForm next={searchParams.next} />
      <p className="text-center text-[15px] text-muted-foreground">
        New here?{' '}
        <Link href="/signup" className="link font-medium">
          Create an account
        </Link>
      </p>
    </div>
  );
}
