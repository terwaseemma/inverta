import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ResetPasswordForm } from './reset-password-form';

export const metadata = { title: 'Choose a new password · Inverta' };
export const dynamic = 'force-dynamic';

export default async function ResetPasswordPage() {
  // The recovery link signs the user in on arrival — no session means the
  // link expired, was already used, or someone navigated here directly.
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="space-y-6 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Link expired</h1>
        <p className="text-sm text-muted-foreground">
          This reset link has expired or was already used. Request a fresh one and
          try again.
        </p>
        <Link
          href="/forgot-password"
          className="signup-gradient-hover glass-button inline-flex h-11 items-center rounded-md px-6 text-sm font-medium text-foreground transition-all duration-200"
        >
          Request new link
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Choose a new password</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Setting a new password for {user.email}.
        </p>
      </div>
      <ResetPasswordForm />
    </div>
  );
}
