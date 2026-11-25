import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Check, CreditCard, Package, Rocket, Sparkles, User } from 'lucide-react';
import { requireInstaller } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getAppUrl } from '@/lib/app-url';
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
    <main className="min-h-screen">
      <div className="px-4 py-10 sm:px-6 sm:py-14">
        <div className="mx-auto max-w-2xl">
          <div className="mb-8 flex items-center justify-between">
            <Wordmark size="md" href="/" />
            <div className="text-[13px] text-muted-foreground">
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
                    'grid h-10 w-10 shrink-0 place-items-center rounded-full text-[13px] font-semibold transition-colors',
                    step > st.n
                      ? 'bg-foreground text-background'
                      : step === st.n
                        ? 'bg-primary text-primary-foreground'
                        : 'border bg-card text-muted-foreground hover:text-foreground',
                  )}
                >
                  {step > st.n ? <Check className="h-4 w-4" /> : <st.Icon className="h-4 w-4" />}
                </Link>
                <div className="hidden sm:block">
                  <div
                    className={cn(
                      'text-[15px] font-medium',
                      step >= st.n ? 'text-foreground' : 'text-muted-foreground',
                    )}
                  >
                    {st.label}
                  </div>
                  {st.optional && (
                    <div className="text-[13px] text-muted-foreground">Optional</div>
                  )}
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={cn('ml-1 h-px flex-1', step > st.n ? 'bg-foreground' : 'bg-border')}
                  />
                )}
              </li>
            ))}
          </ol>

          <div className="card p-6 sm:p-8">
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
                  sub="Your calculator quotes real prices from your catalog. Load ours to start — its prices are trade cost, so set your own before customers see them — or skip and add products later."
                />
                {catalogCount > 0 ? (
                  <div className="space-y-5">
                    <div className="flex items-start gap-3 rounded-xl bg-secondary p-4 text-[15px]">
                      <Check className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden />
                      <span>
                        Your catalog has {catalogCount} item{catalogCount === 1 ? '' : 's'}. Review
                        the prices from your dashboard before you share your link.
                      </span>
                    </div>
                    <div className="flex justify-end">
                      <Link
                        href="/onboarding?step=3"
                        className="btn btn-primary"
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
                        className="btn btn-primary h-12 px-7 text-base w-full"
                      >
                        <Sparkles className="h-4 w-4" />
                        Load the starter catalog
                      </button>
                    </form>
                    <p className="text-center text-[13px] text-muted-foreground">
                      Without a catalog, your calculator shows customers their system
                      sizing but no prices — leads are still captured either way.
                    </p>
                    <div className="flex justify-center">
                      <Link
                        href="/onboarding?step=3"
                        className="btn btn-ghost"
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
                  appUrl={getAppUrl()}
                />
              </>
            )}
          </div>

          {step < 4 && (
            <p className="mt-4 text-center text-[13px] text-muted-foreground">
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
      <h1 className="text-[26px] font-semibold tracking-[-0.02em]">{title}</h1>
      <p className="mt-1 text-[15px] leading-relaxed text-muted-foreground">{sub}</p>
    </div>
  );
}
