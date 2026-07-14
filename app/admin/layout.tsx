import Link from 'next/link';
import { ArrowLeft, LayoutDashboard, Package, Users } from 'lucide-react';
import { Wordmark } from '@/components/brand/Wordmark';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { requireAdmin } from '@/lib/auth';

const NAV = [
  { href: '/admin', label: 'Overview', Icon: LayoutDashboard },
  { href: '/admin/catalog', label: 'Platform catalog', Icon: Package },
  { href: '/admin/installers', label: 'Installers', Icon: Users },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { installer } = await requireAdmin();

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <aside className="border-b border-sidebar-border bg-sidebar lg:flex lg:w-60 lg:shrink-0 lg:flex-col lg:border-b-0 lg:border-r">
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-6">
          <div className="flex items-center gap-2">
            <Wordmark size="sm" href="/admin" />
            <span className="rounded-full border border-primary/40 bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
              Admin
            </span>
          </div>
          <ThemeToggle />
        </div>
        <nav className="flex gap-1 overflow-x-auto p-3 lg:flex-1 lg:flex-col lg:overflow-visible">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex shrink-0 items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
            >
              <item.Icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="hidden border-t border-sidebar-border p-4 lg:block">
          <div className="mb-3 text-xs">
            <div className="font-medium text-sidebar-foreground">
              {installer.businessName}
            </div>
            <div className="text-sidebar-foreground/60">Signed in as admin</div>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-sidebar-border bg-sidebar-accent/30 px-3 py-2 text-xs font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to my dashboard
          </Link>
        </div>
      </aside>
      <main className="flex-1 bg-background">{children}</main>
    </div>
  );
}
