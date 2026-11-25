import type { Metadata } from 'next';
import { marketerShare, shareMetadata } from '@/lib/og/share-copy';
import { CalculatorShell } from '../../calculator-shell';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: { slug: string; code: string };
}): Promise<Metadata> {
  return shareMetadata(
    await marketerShare(params.slug, params.code),
    `/calc/${encodeURIComponent(params.slug)}/m/${encodeURIComponent(params.code)}`,
  );
}

// A marketer's link: /calc/<installer>/m/<code>. Same calculator, and every
// quote requested through it is credited to that marketer.
export default function MarketerCalculatorPage({
  params,
}: {
  params: { slug: string; code: string };
}) {
  return <CalculatorShell slug={params.slug} memberCode={params.code} />;
}
