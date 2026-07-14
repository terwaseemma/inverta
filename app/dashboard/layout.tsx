import Link from 'next/link';
import { Wordmark } from '@/components/brand/Wordmark';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { PostHogIdentify } from '@/components/analytics/PostHogIdentify';
import { LogoutButton } from './logout-button';
import { MobileNav } from './mobile-nav';
import { NAV_ITEMS } from './nav';
import { requireOnboardedInstaller } from '@/lib/auth';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { installer, email } = await requireOnboardedInstaller();

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <PostHogIdentify
        installerId={installer.id}
        email={email}
        businessName={installer.businessName}
      />
      {/* Mobile top bar — visible only < lg */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border/40 bg-background/90 px-3 backdrop-blur lg:hidden">
        <MobileNav installerName={installer.businessName} email={email} />
        <div className="pointer-events-none absolute inset-x-0 flex justify-center">
          <Wordmark size="sm" href="/dashboard" className="pointer-events-auto" />
        </div>
        <ThemeToggle />
      </header>

      {/* Desktop sidebar — visible only ≥ lg */}
      <aside className="hidden w-60 shrink-0 border-r border-sidebar-border bg-sidebar lg:flex lg:flex-col">
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-6">
          <Wordmark size="sm" href="/dashboard" />
          <ThemeToggle />
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
            >
              <item.Icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-sidebar-border p-4">
          <div className="mb-3 text-xs">
            <div className="font-medium text-sidebar-foreground">
              {installer.businessName}
            </div>
            <div className="truncate text-sidebar-foreground/60">{email}</div>
          </div>
          <LogoutButton />
        </div>
      </aside>

      <main className="flex-1 bg-background">{children}</main>
    </div>
  );
}
