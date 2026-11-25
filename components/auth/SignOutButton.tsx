'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';

// Sign-out for pages outside the dashboard chrome. The dashboard keeps its own
// sidebar-styled LogoutButton; this one fits a card or a plain header.
export function SignOutButton({ className }: { className?: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function signOut() {
    startTransition(async () => {
      const { createSupabaseBrowserClient } = await import('@/lib/supabase/client');
      await createSupabaseBrowserClient().auth.signOut();
      router.push('/login');
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={pending}
      className={cn(
        'btn btn-secondary',
        className,
      )}
    >
      <LogOut className="h-4 w-4" />
      {pending ? 'Signing out…' : 'Sign out'}
    </button>
  );
}
