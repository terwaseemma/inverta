'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Package, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/admin', label: 'Overview', Icon: LayoutDashboard },
  { href: '/admin/catalog', label: 'Platform catalog', Icon: Package },
  { href: '/admin/installers', label: 'Installers', Icon: Users },
];

// Same nav treatment as the dashboard: the current page carries an ink pill.
export function AdminNav() {
  const pathname = usePathname();
  const isCurrent = (href: string) =>
    href === '/admin' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav aria-label="Admin" className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
      {NAV.map((item) => {
        const current = isCurrent(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={current ? 'page' : undefined}
            className={cn(
              'flex h-11 shrink-0 items-center gap-3 rounded-xl px-3 text-[15px] font-medium transition-colors duration-150',
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
    </nav>
  );
}
