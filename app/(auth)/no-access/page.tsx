import { ShieldOff } from 'lucide-react';
import { SignOutButton } from '@/components/auth/SignOutButton';

export const metadata = { title: 'No access · Inverta' };

// Where a signed-in login lands when it has no account to open: a team member
// whose access was switched off, or a login whose account was deleted.
//
// It has to be its own page. Sending a signed-in user to /login or /signup
// bounces off the middleware straight back to /dashboard, which redirects
// here again — so the only way out is a page that offers to sign out.
export default function NoAccessPage() {
  return (
    <div className="space-y-6 text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-destructive/10 text-destructive">
        <ShieldOff className="h-7 w-7" />
      </div>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">No access</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This login isn&apos;t connected to an active account. If you were part of a
          solar company&apos;s team, the owner may have removed your access — ask them
          to restore it.
        </p>
      </div>
      <SignOutButton className="w-full" />
    </div>
  );
}
