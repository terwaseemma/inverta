import Link from 'next/link';
import { BrandIcon, Wordmark } from '@/components/brand/Wordmark';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { PostHogIdentify } from '@/components/analytics/PostHogIdentify';
import { requireOnboardedInstaller } from '@/lib/auth';
import { AccountCard } from './account-card';
import { MobileNav } from './mobile-nav';
import { NavLinks } from './nav-links';

// The owner's shell: a floating sidebar card on the canvas (desktop), a slim
// top bar with a drawer (phone). Pages render into <main> on the canvas and
// lay out their own cards.
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { installer, email } = await requireOnboardedInstaller();
  const isAdmin = installer.role === 'ADMIN';

  return (
    <div className="min-h-screen lg:flex">
      <PostHogIdentify
        installerId={installer.id}
        email={email}
        businessName={installer.businessName}
      />

      {/* Phone and tablet: slim bar, drawer for the nav. */}
      <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b bg-card px-4 lg:hidden">
        <MobileNav
          businessName={installer.businessName}
          email={email}
          logoUrl={installer.logoUrl}
          isAdmin={isAdmin}
        />
        <Wordmark size="sm" href="/dashboard" />
        <div className="flex-1" />
        <ThemeToggle />
      </header>

      {/* Desktop: the sidebar floats on the canvas as one card. */}
      <aside className="hidden lg:block lg:w-[272px] lg:shrink-0 lg:p-4 lg:pr-0">
        <div className="card sticky top-4 flex h-[calc(100vh-2rem)] flex-col p-4">
          <div className="flex h-12 items-center justify-between px-1">
            <Link href="/dashboard" className="flex items-center gap-2.5" aria-label="Inverta dashboard">
              <BrandIcon size={28} />
              <Wordmark size="sm" />
            </Link>
            <ThemeToggle />
          </div>

          <div className="mt-6 flex-1 overflow-y-auto">
            <NavLinks isAdmin={isAdmin} />
          </div>

          <AccountCard
            businessName={installer.businessName}
            email={email}
            logoUrl={installer.logoUrl}
          />
        </div>
      </aside>

      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
