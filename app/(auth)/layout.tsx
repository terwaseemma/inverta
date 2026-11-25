import Link from 'next/link';
import { BrandIcon, Wordmark } from '@/components/brand/Wordmark';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

// Sign-in, sign-up, invites and recovery: one quiet card on the canvas, the
// brand above it, nothing competing with the form.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-screen">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="mx-auto flex min-h-screen w-full max-w-[440px] flex-col justify-center px-4 py-16">
        <Link href="/" className="mb-8 flex items-center justify-center gap-3" aria-label="Inverta home">
          <BrandIcon size={34} />
          <Wordmark size="md" />
        </Link>
        <div className="card p-6 sm:p-8">{children}</div>
      </div>
    </main>
  );
}
