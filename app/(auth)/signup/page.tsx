import Link from 'next/link';
import { SignupForm } from './signup-form';

export const metadata = { title: 'Sign up · Inverta' };

export default function SignupPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[26px] font-semibold tracking-[-0.02em]">
          Create your installer account
        </h1>
        <p className="mt-1 text-[15px] leading-relaxed text-muted-foreground">
          Set up your branded calculator and start capturing leads in minutes.
        </p>
      </div>
      <SignupForm />
      <p className="text-center text-[15px] text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="link font-medium">
          Sign in
        </Link>
      </p>
    </div>
  );
}
