'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

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
      className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-sidebar-border bg-sidebar-accent/30 px-3 py-2 text-xs font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent disabled:opacity-50"
    >
      <LogOut className="h-3.5 w-3.5" />
      {pending ? 'Signing out…' : 'Sign out'}
    </button>
  );
}
