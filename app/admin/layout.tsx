import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Wordmark } from '@/components/brand/Wordmark';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { requireAdmin } from '@/lib/auth';
import { AdminNav } from './admin-nav';

// The platform admin shell — the dashboard's shell with an Admin mark, so it is
// unmistakable which side of the platform you are on.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { installer } = await requireAdmin();

  return (
    <div className="min-h-screen lg:flex">
      <aside className="border-b bg-card p-4 lg:w-[272px] lg:shrink-0 lg:border-b-0 lg:bg-transparent lg:pr-0">
        <div className="lg:card lg:sticky lg:top-4 lg:flex lg:h-[calc(100vh-2rem)] lg:flex-col lg:p-4">
          <div className="flex h-12 items-center justify-between gap-2 px-1">
            {/* Wordmark alone here: the Admin chip needs the room the icon took. */}
            <Link href="/admin" className="flex shrink-0 items-center" aria-label="Inverta admin">
              <Wordmark size="sm" />
            </Link>
            <span className="chip bg-foreground text-background">Admin</span>
            <div className="flex-1" />
            <ThemeToggle />
          </div>
          <div className="mt-4 lg:mt-6 lg:flex-1">
            <AdminNav />
          </div>
          <div className="hidden rounded-2xl bg-secondary p-3 lg:block">
            <div className="truncate text-sm font-semibold">{installer.businessName}</div>
            <div className="text-[13px] text-muted-foreground">Signed in as admin</div>
            <Link href="/dashboard" className="btn btn-secondary btn-sm mt-3 w-full">
              <ArrowLeft className="h-3.5 w-3.5" /> My dashboard
            </Link>
          </div>
        </div>
      </aside>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
