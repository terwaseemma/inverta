import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/next';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Inverta — Solar Quotation Intelligence',
  description: 'Solar sizing, lead capture, and proposal generation for installers.',
  // Favicon points at the public asset. Do NOT add an app/icon.png metadata
  // file — it would generate a /icon.png route that conflicts with
  // public/icon.png (used by <Image> across the site) and 500s both.
  icons: {
    icon: '/icon.png',
    apple: '/icon.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning is required by next-themes so it can toggle the
    // `dark` class on <html> before hydration without React complaining.
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
