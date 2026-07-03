import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Check, CreditCard, Package, Rocket, Sparkles, User } from 'lucide-react';
import { requireInstaller } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Wordmark } from '@/components/brand/Wordmark';
import { cn } from '@/lib/utils';
import { ProfileStepForm, PaymentStepForm, FinishForm } from './wizard-forms';
import { loadStarterCatalogStepAction } from './actions';

export const metadata = { title: 'Onboarding · Inverta' };

const STEPS = [
  { n: 1, label: 'Profile', Icon: User, optional: false },
  { n: 2, label: 'Catalog', Icon: Package, optional: true },
  { n: 3, label: 'Payment', Icon: CreditCard, optional: true },
  { n: 4, label: 'Launch', Icon: Rocket, optional: false },
];

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: { step?: string };
}) {
  const { installer } = await requireInstaller();
  if (installer.onboardedAt) redirect('/dashboard');

  const step = Math.min(4, Math.max(1, Number(searchParams.step) || 1));

  const [catalogCount, calcLink] = await Promise.all([
    prisma.catalogItem.count({ where: { installerId: installer.id } }),
    prisma.calculatorLink.findUnique({ where: { installerId: installer.id } }),
  ]);

  return (
    <main className="min-h-screen hero-gradient">
      <div className="container py-12">
        <div className="mx-auto max-w-2xl">
          <div className="mb-8 flex items-center justify-between">
            <Wordmark size="md" href="/" />
            <div className="text-xs text-muted-foreground">
              Setting up <span className="text-foreground">{installer.businessName}</span>
            </div>
          </div>

          {/* Step indicator */}
          <ol className="mb-8 flex items-center gap-2">
            {STEPS.map((st, i) => (
              <li key={st.n} className="flex flex-1 items-center gap-2">
                <Link
                  href={`/onboarding?step=${st.n}`}
                  className={cn(
                    'grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-semibold transition-colors',
                    step > st.n
                      ? 'bg-primary text-primary-foreground'
                      : step === st.n
                        ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
                        : 'bg-secondary text-muted-foreground hover:text-foreground',
                  )}
                >
                  {step > st.n ? <Check className="h-4 w-4" /> : <st.Icon className="h-4 w-4" />}
                </Link>
                <div className="hidden sm:block">
                  <div
                    className={cn(
                      'text-xs font-medium',
                      step >= st.n ? 'text-foreground' : 'text-muted-foreground',
                    )}
                  >
                    {st.label}
                  </div>
                  {st.optional && (
                    <div className="text-[10px] text-muted-foreground">Optional</div>
                  )}
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={cn('ml-1 h-px flex-1', step > st.n ? 'bg-primary' : 'bg-border')}
                  />
                )}
              </li>
            ))}
          </ol>

          <div className="rounded-xl border bg-card/80 p-8 shadow-2xl backdrop-blur">
            {step === 1 && (
              <>
                <StepHeading
                  title="Tell customers who you are"
                  sub="Your logo and details appear on your calculator and every proposal PDF. All fields are optional — you can polish this later in Settings."
                />
                <ProfileStepForm
                  defaults={{
                    logoUrl: installer.logoUrl ?? '',
                    websiteUrl: installer.websiteUrl ?? '',
                    address: installer.address ?? '',
                    bio: installer.bio ?? '',
                  }}
                />
              </>
            )}

            {step === 2 && (
              <>
                <StepHeading
                  title="Stock your catalog"
                  sub="Your calculator quotes real prices from your product catalog. Start with our template at market-typical prices and edit them anytime — or skip and add products later."
                />
                {catalogCount > 0 ? (
                  <div className="space-y-5">
                    <div className="rounded-md border border-primary/30 bg-primary/5 p-4 text-sm">
                      ✓ Your catalog has {catalogCount} item{catalogCount === 1 ? '' : 's'}.
                      You can manage them from the dashboard after setup.
                    </div>
                    <div className="flex justify-end">
                      <Link
                        href="/onboarding?step=3"
                        className="signup-gradient-hover glass-button inline-flex h-11 items-center rounded-md px-6 text-sm font-medium text-foreground transition-all duration-200"
                      >
                        Continue
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-5">
                    <form action={loadStarterCatalogStepAction}>
                      <button
                        type="submit"
                        className="signup-gradient-hover glass-button inline-flex h-12 w-full items-center justify-center gap-2 rounded-md text-sm font-medium text-foreground transition-all duration-200"
                      >
                        <Sparkles className="h-4 w-4" />
                        Load starter catalog (15 items, editable)
                      </button>
                    </form>
                    <p className="text-center text-xs text-muted-foreground">
                      Without a catalog, your calculator shows customers their system
                      sizing but no prices — leads are still captured either way.
                    </p>
                    <div className="flex justify-center">
                      <Link
                        href="/onboarding?step=3"
                        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                      >
                        Skip for now
                      </Link>
                    </div>
                  </div>
                )}
              </>
            )}

            {step === 3 && (
              <>
                <StepHeading
                  title="Where should customers pay?"
                  sub="Your account details print on every proposal so customers can pay you directly. Skip if you'd rather add them later in Settings."
                />
                <PaymentStepForm
                  defaults={{
                    bankName: installer.bankName ?? '',
                    bankAccountNumber: installer.bankAccountNumber ?? '',
                    bankAccountName: installer.bankAccountName ?? '',
                  }}
                />
              </>
            )}

            {step === 4 && (
              <>
                <StepHeading
                  title="Launch your calculator"
                  sub="Confirm your public link — this is the URL you'll share with customers."
                />
                <FinishForm
                  defaultSlug={calcLink?.slug ?? installer.slug}
                  appUrl={process.env.NEXT_PUBLIC_APP_URL ?? ''}
                />
              </>
            )}
          </div>

          {step < 4 && (
            <p className="mt-4 text-center text-xs text-muted-foreground">
              You can revisit every step later from your dashboard settings.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}

function StepHeading({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{sub}</p>
    </div>
  );
}
