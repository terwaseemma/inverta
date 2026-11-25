'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ThemeProvider as NextThemesProvider, type ThemeProviderProps } from 'next-themes';

const STORAGE_KEY = 'theme';
/** Fired by ThemeToggle when someone picks a theme, so the route default stops applying. */
export const THEME_CHOICE_EVENT = 'inverta:theme-choice';

/**
 * The theme a page shows to someone who has never picked one: the marketing
 * homepage is dark, everything else light.
 */
export function routeDefaultTheme(pathname: string | null): 'dark' | 'light' {
  return pathname === '/' ? 'dark' : 'light';
}

// next-themes, with a per-route default that holds until the visitor picks a
// theme with the toggle; from then on their choice applies on every page.
//
// - First paint: next-themes' pre-paint script reads the saved choice or falls
//   back to `defaultTheme`, which we set from the route, so a first visit to
//   the homepage paints dark with no flash.
// - Moving between pages: next-themes keeps its own state from the first page,
//   so while there's no saved choice we force each route's default
//   (forcedTheme never writes to storage). It's only set after mount, so the
//   server render can't override a saved choice before the page reads it.
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  const pathname = usePathname();
  const routeDefault = routeDefaultTheme(pathname);
  const [hasChoice, setHasChoice] = useState<boolean | null>(null);

  useEffect(() => {
    const read = () => {
      try {
        setHasChoice(localStorage.getItem(STORAGE_KEY) != null);
      } catch {
        setHasChoice(false);
      }
    };
    read();
    window.addEventListener(THEME_CHOICE_EVENT, read);
    window.addEventListener('storage', read);
    return () => {
      window.removeEventListener(THEME_CHOICE_EVENT, read);
      window.removeEventListener('storage', read);
    };
  }, []);

  return (
    <NextThemesProvider
      {...props}
      storageKey={STORAGE_KEY}
      defaultTheme={routeDefault}
      forcedTheme={hasChoice === false ? routeDefault : undefined}
    >
      {children}
    </NextThemesProvider>
  );
}
