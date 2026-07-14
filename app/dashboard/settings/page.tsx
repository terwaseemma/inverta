import { requireOnboardedInstaller } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getAppUrl } from '@/lib/app-url';
import {
  ProfileForm,
  PricingForm,
  PaymentForm,
  CalculatorLinkForm,
} from './settings-forms';
import { DangerZone } from './danger-zone';

export const metadata = { title: 'Settings · Inverta' };

export default async function SettingsPage() {
  const { installer, email } = await requireOnboardedInstaller();
  const calcLink = await prisma.calculatorLink.findUnique({
    where: { installerId: installer.id },
  });

  const appUrl = getAppUrl();

  return (
    <div className="container max-w-3xl py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Signed in as {email}. Changes apply to your calculator and future proposals
          immediately.
        </p>
      </div>

      <div className="space-y-8">
        <section className="rounded-xl border bg-card/80 p-6 backdrop-blur">
          <h2 className="mb-4 font-semibold">Business profile</h2>
          <ProfileForm
            defaults={{
              businessName: installer.businessName,
              contactName: installer.contactName,
              phone: installer.phone,
              region: installer.region,
              logoUrl: installer.logoUrl ?? '',
              websiteUrl: installer.websiteUrl ?? '',
              address: installer.address ?? '',
              bio: installer.bio ?? '',
            }}
          />
        </section>

        <section className="rounded-xl border bg-card/80 p-6 backdrop-blur">
          <h2 className="mb-1 font-semibold">Pricing</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Applied to every calculator quote and new proposal.
          </p>
          <PricingForm
            defaults={{
              markupPercent: installer.markupPercent,
              feeMode: installer.installationFeePercent != null ? 'percent' : 'flat',
              installationFeeNaira: installer.installationFeeKobo / 100,
              installationFeePercent: installer.installationFeePercent ?? 10,
            }}
          />
        </section>

        <section className="rounded-xl border bg-card/80 p-6 backdrop-blur">
          <h2 className="mb-1 font-semibold">Payment details</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Printed on your proposals so customers know where to pay. Leave blank to
            omit.
          </p>
          <PaymentForm
            defaults={{
              bankName: installer.bankName ?? '',
              bankAccountNumber: installer.bankAccountNumber ?? '',
              bankAccountName: installer.bankAccountName ?? '',
            }}
          />
        </section>

        <section className="rounded-xl border bg-card/80 p-6 backdrop-blur">
          <h2 className="mb-1 font-semibold">Calculator link</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Your public handle — used for your calculator and storefront URLs.
          </p>
          <CalculatorLinkForm
            appUrl={appUrl}
            defaults={{
              slug: calcLink?.slug ?? installer.slug,
              isActive: calcLink?.isActive ?? true,
            }}
          />
        </section>

        <section className="rounded-xl border border-destructive/30 bg-card/80 p-6 backdrop-blur">
          <h2 className="mb-4 font-semibold text-destructive">Danger zone</h2>
          <DangerZone businessName={installer.businessName} />
        </section>
      </div>
    </div>
  );
}
