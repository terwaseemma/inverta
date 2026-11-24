import { Wordmark } from '@/components/brand/Wordmark';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { SignOutButton } from '@/components/auth/SignOutButton';
import { requireMarketer } from '@/lib/auth';

// The marketer area. Everything here sits behind requireMarketer, and nothing
// else in the app admits marketers — so this tree is the whole of what they
// can reach. Kept to a top bar: a marketer does two things, share their link
// and follow their leads, mostly from a phone.
export default async function TeamLayout({ children }: { children: React.ReactNode }) {
  const { installer, member } = await requireMarketer();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/40 bg-background/90 backdrop-blur">
        <div className="container flex h-14 max-w-3xl items-center gap-3">
          <Wordmark size="sm" href="/team" />
          <div className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
            <span className="text-foreground">{member.name}</span> · {installer.businessName}
          </div>
          <ThemeToggle />
          <SignOutButton className="h-8 px-3 text-xs" />
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
