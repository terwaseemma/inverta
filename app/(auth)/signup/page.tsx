import Link from 'next/link';
import { SignupForm } from './signup-form';

export const metadata = { title: 'Sign up · Inverta' };

export default function SignupPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Create your installer account
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Set up your branded calculator and start capturing leads in minutes.
        </p>
      </div>
      <SignupForm />
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="orange-text hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
