import Link from 'next/link';
import { BrandIcon, Wordmark } from '@/components/brand/Wordmark';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen hero-gradient">
      <div className="container flex min-h-screen flex-col items-center justify-center py-12">
        {/* Real brand assets (icon + wordmark image), linked back to the
            landing page — same treatment as the marketing header. */}
        <Link href="/" className="mb-8 flex items-center gap-3">
          <BrandIcon size={36} />
          <Wordmark size="md" />
        </Link>
        <div className="w-full max-w-md rounded-xl border bg-card/80 p-8 shadow-2xl backdrop-blur">
          {children}
        </div>
      </div>
    </main>
  );
}
