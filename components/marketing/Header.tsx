'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

// Marketing site header — ported from the Vite marketing site verbatim
// EXCEPT: Sign up now links to /signup on this app, Sign in was added and
// links to /login. The About/Installers/Packages links keep their existing
// bit.ly destinations until real pages exist.
export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="relative z-20 w-full px-6 py-6 lg:px-8">
      <nav className="mx-auto flex max-w-7xl items-center justify-between">
        <Link href="/" className="flex items-center">
          <Image src="/icon.png" alt="Inverta" width={32} height={32} className="h-8 w-auto" priority />
        </Link>

        <div className="hidden items-center space-x-8 md:flex">
          <Link href="/about" className="text-foreground transition-colors hover:text-orange">
            About
          </Link>
          <Link
            href="/installers"
            className="text-foreground transition-colors hover:text-orange"
          >
            Installers
          </Link>
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <ThemeToggle />
          <Link
            href="/login"
            className="text-sm text-foreground/80 transition-colors hover:text-foreground"
          >
            Sign in
          </Link>
          <Link href="/signup">
            <Button
              variant="outline"
              className="glass-button signup-gradient-hover border-border transition-all duration-200"
            >
              Sign up
            </Button>
          </Link>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <button
            className="p-2 text-foreground transition-colors hover:text-orange"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </nav>

      {isMenuOpen && (
        <div className="mt-4 border-t border-border/20 pb-4 md:hidden">
          <div className="flex flex-col items-center space-y-4 pt-4 text-center">
            <Link
              href="/about"
              className="text-foreground transition-colors hover:text-orange"
            >
              About
            </Link>
            <Link
              href="/installers"
              className="text-foreground transition-colors hover:text-orange"
            >
              Installers
            </Link>
            <Link
              href="/login"
              className="text-sm text-foreground/80 transition-colors hover:text-foreground"
            >
              Sign in
            </Link>
            <Link href="/signup" className="inline-block">
              <Button
                variant="outline"
                className="glass-button signup-gradient-hover w-32 border-border transition-all duration-200"
              >
                Sign up
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
