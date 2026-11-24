import { CalculatorShell } from './calculator-shell';

export const dynamic = 'force-dynamic';

// The installer's own public link. Marketer links live at ./m/[code] and
// render the same shell with attribution.
export default function CalculatorPage({ params }: { params: { slug: string } }) {
  return <CalculatorShell slug={params.slug} />;
}
