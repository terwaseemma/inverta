import 'server-only';

import { normalizeMemberCode } from '@inverta/shared';
import { prisma } from '@/lib/prisma';
import { getAppUrl } from '@/lib/app-url';
import type { ShareCardProps } from './share-card';

// What each shareable link says when it's pasted into a chat. The page title
// and description (the text under the preview) and the preview image are
// written together here so they never disagree.
//
// The reader is a homeowner or business owner tired of fuel and NEPA bills,
// scrolling WhatsApp. One promise each: what they get, how fast, from whom.

export type ShareCopy = {
  title: string;
  description: string;
  card: Omit<ShareCardProps, 'business'> & {
    business?: { name: string; logoUrl: string | null; line?: string };
  };
};

const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name;

async function findInstallerBySlug(slug: string) {
  return prisma.installer.findUnique({
    where: { slug },
    select: { id: true, businessName: true, logoUrl: true, region: true },
  });
}

async function findCalculator(slug: string) {
  const link = await prisma.calculatorLink.findUnique({
    where: { slug },
    select: {
      isActive: true,
      installer: { select: { id: true, businessName: true, logoUrl: true, region: true } },
    },
  });
  return link?.isActive ? link.installer : null;
}

const installerLine = (region: string | null | undefined) =>
  region ? `Solar installer · ${region}` : 'Solar installer';

/** /calc/<slug> — the installer's own calculator link. */
export async function calculatorShare(slug: string): Promise<ShareCopy> {
  const installer = await findCalculator(slug);
  if (!installer) return fallbackShare();
  const name = installer.businessName;
  return {
    title: `Free solar quote from ${name}`,
    description: `Tick the appliances you want to power and see the solar system you need — and what it costs — in 2 minutes. Free, from ${name}.`,
    card: {
      business: { name, logoUrl: installer.logoUrl, line: installerLine(installer.region) },
      headline: 'What would solar cost for your home?',
      sub: `Pick your appliances, get the right system and a real price from ${name}. Free, in 2 minutes.`,
      cta: 'Get my free quote',
      tag: { title: 'Sized in 2 minutes', note: 'Inverter, battery and panels' },
    },
  };
}

/** /calc/<slug>/m/<code> — a marketer's personal link. */
export async function marketerShare(slug: string, code: string): Promise<ShareCopy> {
  const installer = await findCalculator(slug);
  if (!installer) return fallbackShare();
  const normalized = normalizeMemberCode(code);
  const marketer = normalized
    ? await prisma.member.findFirst({
        where: { code: normalized, installerId: installer.id, role: 'MARKETER', isActive: true },
        select: { name: true },
      })
    : null;
  // An unknown code still gets the installer's own preview — the link works.
  if (!marketer) return calculatorShare(slug);

  const who = firstName(marketer.name);
  const name = installer.businessName;
  return {
    title: `${who} sent you a free solar quote · ${name}`,
    description: `See the solar system your home needs and what it costs in 2 minutes. ${who} from ${name} will help you from there.`,
    card: {
      business: { name, logoUrl: installer.logoUrl, line: installerLine(installer.region) },
      eyebrow: `${who} sent you this`,
      headline: 'Ready to leave the generator behind?',
      sub: `Pick your appliances and see your solar system and price in 2 minutes. ${who} from ${name} takes it from there.`,
      cta: 'Get my free quote',
      tag: { title: 'No more fuel runs', note: 'Quiet power, day and night' },
    },
  };
}

/** /store/<slug> — the installer's storefront. */
export async function storeShare(slug: string): Promise<ShareCopy> {
  const installer = await findInstallerBySlug(slug);
  if (!installer) return fallbackShare();
  const count = await prisma.product.count({
    where: { installerId: installer.id, isAvailable: true },
  });
  const name = installer.businessName;
  return {
    title: `${name} — Solar store`,
    description: `Solar generators, inverters, batteries and panels from ${name}, with prices shown upfront. Enquire on WhatsApp.`,
    card: {
      business: { name, logoUrl: installer.logoUrl, line: installerLine(installer.region) },
      headline: 'Solar systems, ready to install.',
      sub: `Generators, inverters, batteries and panels from ${name}. See the price, then enquire on WhatsApp.`,
      cta: 'Visit the store',
      tag:
        count > 0
          ? { title: `${count} product${count === 1 ? '' : 's'} in stock`, note: 'Prices shown upfront' }
          : { title: 'Prices shown upfront', note: 'Enquire on WhatsApp' },
    },
  };
}

/** The home page, and any link whose business can't be found. */
export function fallbackShare(): ShareCopy {
  return {
    title: 'Inverta — Solar sales made easy',
    description:
      'Your own solar calculator: customers size their system and see your price in two minutes, and you get the lead.',
    card: {
      headline: 'Solar sales,\nmade easy.',
      sub: 'Your own solar calculator. Customers size their system and see your price in two minutes — you get the lead.',
      cta: 'Create your calculator, free',
      tag: { title: 'New lead', note: 'Sized, priced and ready to call' },
    },
  };
}

/**
 * Page metadata for a share: title, description, and preview text. Next
 * replaces (not merges) the layout's openGraph/twitter objects, so the shared
 * fields are repeated here or the large-image card is lost.
 *
 * `path` is the page's own path (/calc/boostsolar); its preview image is the
 * opengraph-image route beside it. The image is named here, as a full URL on
 * the host the request came in on (www.inverta.app in production), instead
 * of leaving Next to build it from the build-time NEXT_PUBLIC_APP_URL: a value
 * baked in before that variable was set pointed WhatsApp at localhost, and
 * the apex domain answers with a redirect WhatsApp won't follow for an image.
 * Naming the image turns off Next's automatic tag for the file.
 */
export function shareMetadata(copy: ShareCopy, path: string) {
  const image = {
    url: `${getAppUrl()}${path}/opengraph-image`,
    width: 1200,
    height: 630,
    type: 'image/png',
    alt: copy.title,
  };
  return {
    title: copy.title,
    description: copy.description,
    openGraph: {
      title: copy.title,
      description: copy.description,
      siteName: 'Inverta',
      type: 'website' as const,
      locale: 'en_NG',
      images: [image],
    },
    twitter: {
      card: 'summary_large_image' as const,
      title: copy.title,
      description: copy.description,
      images: [image],
    },
  };
}
