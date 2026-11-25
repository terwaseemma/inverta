'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

// Icon-only sign-out, sized as a full 40px target, named for screen readers.
export function LogoutButton() {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function logout() {
    startTransition(async () => {
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();
      router.push('/login');
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={logout}
      disabled={pending}
      aria-label={pending ? 'Signing out' : 'Sign out'}
      title="Sign out"
      className="btn btn-ghost h-10 w-10 shrink-0 px-0"
    >
      <LogOut className="h-4 w-4" />
    </button>
  );
}
