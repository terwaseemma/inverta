import type { Metadata } from 'next';
import { calculatorShare, shareMetadata } from '@/lib/og/share-copy';
import { CalculatorShell } from './calculator-shell';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  return shareMetadata(await calculatorShare(params.slug), `/calc/${encodeURIComponent(params.slug)}`);
}

// The installer's own public link. Marketer links live at ./m/[code] and
// render the same shell with attribution.
export default function CalculatorPage({ params }: { params: { slug: string } }) {
  return <CalculatorShell slug={params.slug} />;
}
