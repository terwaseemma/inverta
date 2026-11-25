import type { Viewport } from 'next';
import { Header } from '@/components/marketing/Header';
import { Hero } from '@/components/marketing/Hero';
import { Footer } from '@/components/marketing/Footer';

// Marketing landing page — replaces the Vite marketing site's Index.tsx.
// The design is unchanged; only the underlying framework moved to Next.js.
// The homepage defaults to dark (components/theme/ThemeProvider), so the
// phone's browser bar matches it.
export const viewport: Viewport = { themeColor: '#09090b' };

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <Hero />
      <Footer />
    </div>
  );
}
