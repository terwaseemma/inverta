'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ThemeProvider as NextThemesProvider, type ThemeProviderProps } from 'next-themes';

const STORAGE_KEY = 'theme';
/** Fired by ThemeToggle when someone picks a theme, so the default stops applying. */
export const THEME_CHOICE_EVENT = 'inverta:theme-choice';

/** Pages that are always dark, whatever the visitor picked: the homepage. */
export function routeForcedTheme(pathname: string | null): 'dark' | undefined {
  return pathname === '/' ? 'dark' : undefined;
}

/** The theme every other page shows to someone who has never picked one. */
const DEFAULT_THEME = 'light';

// next-themes with two rules:
//
// - The homepage is always dark and has no toggle. Its forced theme is known
//   from the path alone, so it's set from the first (server) render and the
//   pre-paint script paints it dark with no flash, saved choice or not.
// - Every other page is light until the visitor picks a theme with the
//   toggle; their choice then applies everywhere else and is remembered.
//   While there's no saved choice, light is forced after mount too, because
//   next-themes keeps its state from the first page it loaded (which may
//   have been the dark homepage). forcedTheme never writes to storage.
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  const pathname = usePathname();
  const routeForced = routeForcedTheme(pathname);
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
      defaultTheme={DEFAULT_THEME}
      forcedTheme={routeForced ?? (hasChoice === false ? DEFAULT_THEME : undefined)}
    >
      {children}
    </NextThemesProvider>
  );
}
