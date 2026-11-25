import Link from 'next/link';
import { ForgotPasswordForm } from './forgot-password-form';

export const metadata = { title: 'Reset password · Inverta' };

export default function ForgotPasswordPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[26px] font-semibold tracking-[-0.02em]">Reset your password</h1>
        <p className="mt-1 text-[15px] leading-relaxed text-muted-foreground">
          Enter your account email and we&apos;ll send you a reset link.
        </p>
      </div>
      <ForgotPasswordForm />
      <p className="text-center text-[15px] text-muted-foreground">
        Remembered it?{' '}
        <Link href="/login" className="link font-medium">
          Sign in
        </Link>
      </p>
    </div>
  );
}
