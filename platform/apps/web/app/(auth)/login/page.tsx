import Link from 'next/link';
import { LoginForm } from './login-form';

export const metadata = { title: 'Sign in · Inverta' };

export default function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sign in to manage your leads and proposals.
        </p>
      </div>
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
