'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { BrandIcon, Wordmark } from '@/components/brand/Wordmark';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

const NAV = [
  { href: '/about', label: 'About' },
  { href: '/installers', label: 'Installers' },
];

export function Header() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);

  return (
    <header className="relative z-20 w-full">
      <nav
        aria-label="Main"
        className="mx-auto flex h-20 w-full max-w-[1240px] items-center justify-between px-4 sm:px-6 lg:px-8"
      >
        <Link href="/" className="flex items-center gap-2.5" aria-label="Inverta home">
          <BrandIcon size={30} />
          <Wordmark size="sm" className="hidden sm:inline-flex" />
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              aria-current={pathname === n.href ? 'page' : undefined}
              className="text-[15px] text-muted-foreground transition-colors hover:text-foreground aria-[current=page]:text-foreground"
            >
              {n.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle />
          <Link href="/login" className="btn btn-ghost">
            Sign in
          </Link>
          <Link href="/signup" className="btn btn-primary">
            Sign up free
          </Link>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <button
            type="button"
            className="btn btn-secondary h-10 w-10 px-0"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls="mobile-menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {open && (
        <div id="mobile-menu" className="border-t bg-card px-4 pb-6 pt-2 md:hidden">
          <ul className="divide-y">
            {NAV.map((n) => (
              <li key={n.href}>
                <Link href={n.href} className="flex h-12 items-center text-[17px] font-medium">
                  {n.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/login" className="flex h-12 items-center text-[17px] font-medium">
                Sign in
              </Link>
            </li>
          </ul>
          <Link href="/signup" className="btn btn-primary mt-4 w-full">
            Sign up free
          </Link>
        </div>
      )}
    </header>
  );
}
