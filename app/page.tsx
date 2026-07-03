import { Header } from '@/components/marketing/Header';
import { Hero } from '@/components/marketing/Hero';
import { Footer } from '@/components/marketing/Footer';

// Marketing landing page — replaces the Vite marketing site's Index.tsx.
// The design is unchanged; only the underlying framework moved to Next.js.
export default function LandingPage() {
  return (
    <div className="hero-gradient flex min-h-screen flex-col">
      <Header />
      <Hero />
      <Footer />
    </div>
  );
}
