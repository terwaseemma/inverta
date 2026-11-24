import { CalculatorShell } from '../../calculator-shell';

export const dynamic = 'force-dynamic';

// A marketer's link: /calc/<installer>/m/<code>. Same calculator, and every
// quote requested through it is credited to that marketer.
export default function MarketerCalculatorPage({
  params,
}: {
  params: { slug: string; code: string };
}) {
  return <CalculatorShell slug={params.slug} memberCode={params.code} />;
}
