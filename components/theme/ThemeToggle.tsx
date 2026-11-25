'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';

// Renders a sun/moon toggle that flips between light and dark. Renders a
// same-sized placeholder before mount to avoid a hydration-time flip.
export function ThemeToggle({ className }: { className?: string }) {
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === 'dark';
  const label = isDark ? 'Switch to light mode' : 'Switch to dark mode';

  if (!mounted) {
    return (
      <span
        aria-hidden
        className={cn(
          'inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border',
          className,
        )}
      />
    );
  }

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className={cn(
        'btn btn-secondary h-10 w-10 shrink-0 px-0 text-muted-foreground hover:text-foreground',
        className,
      )}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
