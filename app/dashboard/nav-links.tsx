'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NAV_ITEMS } from './nav';

// The dashboard's nav, shared by the desktop sidebar and the mobile drawer so
// they never drift. The current section carries an ink pill — the one strong
// mark in the shell, so orange stays free for actions.
export function NavLinks({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();

  // Overview is exact; every other section owns its sub-pages too
  // (/dashboard/leads/abc still marks Leads).
  const isCurrent = (href: string) =>
    href === '/dashboard' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav aria-label="Dashboard" className="space-y-1">
      {NAV_ITEMS.map((item) => {
        const current = isCurrent(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={current ? 'page' : undefined}
            className={cn(
              'flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-medium transition-colors duration-150',
              current
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
            )}
          >
            <item.Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={current ? 2.2 : 1.8} />
            {item.label}
          </Link>
        );
      })}

      {isAdmin && (
        <Link
          href="/admin"
          className="mt-3 flex h-11 items-center gap-3 rounded-xl border border-dashed px-3 text-[15px] font-medium text-muted-foreground transition-colors duration-150 hover:bg-secondary hover:text-foreground"
        >
          <ShieldCheck className="h-[18px] w-[18px] shrink-0" strokeWidth={1.8} />
          Platform admin
        </Link>
      )}
    </nav>
  );
}
