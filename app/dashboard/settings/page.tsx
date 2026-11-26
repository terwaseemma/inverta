import { requireOnboardedInstaller } from '@/lib/auth';
import { PageHeader, PageShell } from '@/components/app/page';
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
    <PageShell>
      <PageHeader
        title="Settings"
        lead={`Signed in as ${email}. Changes reach your calculator and new proposals straight away.`}
      />

      <div className="divide-y">
        <SettingsSection
          id="profile"
          title="Business profile"
          description="How your business appears on the calculator, proposals and your storefront."
        >
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
        </SettingsSection>

        <SettingsSection
          id="fee"
          title="Installation and cabling"
          description="Your labour fee is added to every calculator quote and new proposal, on top of your catalog prices. A percentage is worked out on the materials: equipment and accessories."
        >
          <PricingForm
            defaults={{
              feeMode: installer.installationFeePercent != null ? 'percent' : 'flat',
              installationFeeNaira: installer.installationFeeKobo / 100,
              installationFeePercent: installer.installationFeePercent ?? 10,
              cableYards: {
                bungalow: installer.cableYardsBungalow,
                one: installer.cableYardsOneStorey,
                two: installer.cableYardsTwoStorey,
                threePlus: installer.cableYardsThreePlus,
              },
            }}
          />
        </SettingsSection>

        <SettingsSection
          id="payment"
          title="Payment details"
          description="Printed on your proposals so customers know where to pay. Leave blank to leave them off."
        >
          <PaymentForm
            defaults={{
              bankName: installer.bankName ?? '',
              bankAccountNumber: installer.bankAccountNumber ?? '',
              bankAccountName: installer.bankAccountName ?? '',
            }}
          />
        </SettingsSection>

        <SettingsSection
          id="link"
          title="Calculator link"
          description="Your public handle, used in your calculator and storefront addresses."
        >
          <CalculatorLinkForm
            appUrl={appUrl}
            defaults={{
              slug: calcLink?.slug ?? installer.slug,
              isActive: calcLink?.isActive ?? true,
            }}
          />
        </SettingsSection>

        <SettingsSection
          id="danger"
          title="Delete account"
          description="Removes your business, catalog, leads, proposals and team for good."
          danger
        >
          <DangerZone businessName={installer.businessName} />
        </SettingsSection>
      </div>
    </PageShell>
  );
}

// The settings pattern: what a group is for on the left, its form on the
// right; stacked on a phone.
function SettingsSection({
  id,
  title,
  description,
  danger,
  children,
}: {
  id: string;
  title: string;
  description: string;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="grid gap-4 py-8 first:pt-0 xl:grid-cols-[240px_1fr] xl:gap-10">
      <div>
        <h2 id={id} className={danger ? 'section-title text-destructive' : 'section-title'}>
          {title}
        </h2>
        <p className="mt-1 text-[15px] leading-relaxed text-muted-foreground">{description}</p>
      </div>
      <div className={danger ? 'card border-destructive/30 p-6' : 'card p-6'}>{children}</div>
    </section>
  );
}
