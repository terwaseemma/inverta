import Link from 'next/link';
import { Mail } from 'lucide-react';

export const metadata = { title: 'Check your email · Inverta' };

export default function VerifyEmailPage() {
  return (
    <div className="space-y-6 text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary/15 text-primary">
        <Mail className="h-7 w-7" />
      </div>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Check your email</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We've sent a confirmation link to your inbox. Click it to verify your
          account and finish setting up your installer profile.
        </p>
      </div>
      <p className="text-xs text-muted-foreground">
        Didn't get it? Check spam, or{' '}
        <Link href="/login" className="orange-text hover:underline">
          sign in
        </Link>{' '}
        to resend.
      </p>
    </div>
  );
}
