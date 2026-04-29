import { redirect } from 'next/navigation';
import { requireInstaller } from '@/lib/auth';
import { OnboardingForm } from './onboarding-form';
import { Wordmark } from '@/components/brand/Wordmark';

export const metadata = { title: 'Onboarding · Inverta' };

export default async function OnboardingPage() {
  const { installer } = await requireInstaller();
  if (installer.onboardedAt) redirect('/dashboard');

  return (
    <main className="min-h-screen hero-gradient">
      <div className="container py-12">
        <div className="mx-auto max-w-2xl">
          <div className="mb-8 flex items-center justify-between">
            <Wordmark size="md" />
            <div className="text-xs text-muted-foreground">
              Step 1 of 3 · Business profile
            </div>
          </div>

          <div className="rounded-xl border bg-card/80 p-8 shadow-2xl backdrop-blur">
            <h1 className="text-2xl font-bold tracking-tight">
              Tell us about <span className="orange-text">{installer.businessName}</span>
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              This information shows up on your branded calculator and proposal PDFs.
            </p>
            <div className="mt-6">
              <OnboardingForm
                defaults={{
                  websiteUrl: installer.websiteUrl ?? '',
                  address: installer.address ?? '',
                  bio: installer.bio ?? '',
                  logoUrl: installer.logoUrl ?? '',
                }}
              />
            </div>
          </div>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            Steps 2 (catalog) and 3 (calculator link) come next. You can also skip and
            finish them later from your dashboard.
          </p>
        </div>
      </div>
    </main>
  );
}
