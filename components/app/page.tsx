import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

// The frame every dashboard page sits in, so content edges match across the
// app: one width per kind of page, one gutter, one vertical rhythm.
export function PageShell({
  children,
  width = 'default',
  className,
}: {
  children: React.ReactNode;
  /** wide: grids and tables. default: lists. narrow: forms and detail. */
  width?: 'wide' | 'default' | 'narrow';
  className?: string;
}) {
  return (
    <div
      className={cn(
        'mx-auto w-full px-4 py-6 sm:px-6 lg:px-8 lg:py-8',
        width === 'wide' && 'max-w-[1240px]',
        width === 'default' && 'max-w-[1040px]',
        width === 'narrow' && 'max-w-[860px]',
        className,
      )}
    >
      {children}
    </div>
  );
}

// Title, one line of context, and up to two actions — the same at the top of
// every page. `back` puts a quiet return link above the title on detail pages.
export function PageHeader({
  title,
  lead,
  actions,
  back,
}: {
  title: React.ReactNode;
  lead?: React.ReactNode;
  actions?: React.ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <header className="mb-6 lg:mb-8">
      {back && (
        <Link
          href={back.href}
          className="mb-4 inline-flex h-9 items-center gap-1.5 rounded-lg pr-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="page-title">{title}</h1>
          {lead && <p className="page-lead">{lead}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

// An empty state that says what will appear and how to make it appear.
export function EmptyState({
  icon: Icon,
  title,
  children,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center px-6 py-14 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-secondary text-muted-foreground">
        <Icon className="h-6 w-6" />
      </span>
      <h2 className="mt-4 text-[17px] font-semibold">{title}</h2>
      {children && (
        <p className="mt-1.5 max-w-sm text-[15px] leading-relaxed text-muted-foreground">{children}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
