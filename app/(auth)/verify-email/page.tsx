import Link from 'next/link';
import { Mail } from 'lucide-react';

export const metadata = { title: 'Check your email · Inverta' };

export default function VerifyEmailPage({
  searchParams,
}: {
  searchParams: { for?: string };
}) {
  // Marketers joining a team arrive here too, and have no installer profile.
  const joiningTeam = searchParams.for === 'team';
  return (
    <div className="space-y-6 text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary/15 text-link">
        <Mail className="h-7 w-7" />
      </div>
      <div>
        <h1 className="text-[26px] font-semibold tracking-[-0.02em]">Check your email</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
          We&apos;ve sent a confirmation link to your inbox. Click it to verify your
          account and{' '}
          {joiningTeam
            ? 'get your calculator link.'
            : 'finish setting up your installer profile.'}
        </p>
      </div>
      <p className="text-[13px] text-muted-foreground">
        Didn&apos;t get it? Check spam, or{' '}
        <Link href="/login" className="link font-medium">
          sign in
        </Link>{' '}
        to resend.
      </p>
    </div>
  );
}
