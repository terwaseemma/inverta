import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Inverta — Solar Quotation Intelligence',
  description: 'Solar sizing, lead capture, and proposal generation for installers.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
