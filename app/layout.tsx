import type { Metadata, Viewport } from 'next';
import { Instrument_Sans } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import { PostHogProvider } from '@/components/analytics/PostHogProvider';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import './globals.css';

// Instrument Sans: a plain grotesk with tabular figures, so prices and kWh
// line up in columns. Self-hosted by next/font (no request to Google at
// runtime, no layout shift) and exposed as --font-sans for Tailwind.
const sans = Instrument_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

// Light is the default for everyone; dark only after someone picks it, so the
// browser chrome follows the light canvas rather than the OS setting.
export const viewport: Viewport = {
  themeColor: '#edece8',
};

// metadataBase makes the generated link-preview image URLs absolute, which
// WhatsApp, X and LinkedIn need to fetch them.
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  title: 'Inverta — Solar sales made easy',
  description:
    'Your own solar calculator: customers size their system and see your price in two minutes, and you get the lead.',
  openGraph: { siteName: 'Inverta', type: 'website', locale: 'en_NG' },
  twitter: { card: 'summary_large_image' },
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
    <html lang="en" suppressHydrationWarning className={sans.variable}>
      <body className="font-sans antialiased">
        <PostHogProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem={false}
            disableTransitionOnChange
          >
            {children}
          </ThemeProvider>
        </PostHogProvider>
        <Analytics />
      </body>
    </html>
  );
}
