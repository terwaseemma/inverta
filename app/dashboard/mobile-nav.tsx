'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { BrandIcon, Wordmark } from '@/components/brand/Wordmark';
import { AccountCard } from './account-card';
import { NavLinks } from './nav-links';

// Menu button + slide-in drawer, below lg only. The drawer is portalled to
// <body> because the sticky header uses backdrop-blur, and a backdrop-filter
// makes a containing block for fixed children — without the portal the
// drawer would be trapped inside the 64px header.
export function MobileNav({
  businessName,
  email,
  logoUrl,
  isAdmin,
}: {
  businessName: string;
  email: string;
  logoUrl: string | null;
  isAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => setMounted(true), []);

  // Close on navigation.
  useEffect(() => setOpen(false), [pathname]);

  // Escape closes; the page behind stops scrolling while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  const drawer = (
    <div className="fixed inset-0 z-[100] lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
      <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
      <aside className="absolute inset-y-0 left-0 flex w-[300px] max-w-[86%] flex-col border-r bg-card p-4">
        <div className="flex h-12 items-center justify-between px-1">
          <span className="flex items-center gap-2.5">
            <BrandIcon size={26} />
            <Wordmark size="sm" />
          </span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="btn btn-ghost h-10 w-10 px-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-6 flex-1 overflow-y-auto">
          <NavLinks isAdmin={isAdmin} />
        </div>
        <AccountCard businessName={businessName} email={email} logoUrl={logoUrl} />
      </aside>
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-expanded={open}
        className="btn btn-secondary h-10 w-10 shrink-0 px-0"
      >
        <Menu className="h-[18px] w-[18px]" />
      </button>
      {mounted && open && createPortal(drawer, document.body)}
    </>
  );
}
