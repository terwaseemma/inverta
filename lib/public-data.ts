import 'server-only';

import { cache } from 'react';
import { normalizeMemberCode } from '@inverta/shared';
import { prisma } from '@/lib/prisma';

// Lookups for the public pages (calculator, marketer links, storefront).
// Each page and its generateMetadata (the link-preview tags) need the same
// rows; React cache() runs each lookup once per request and hands both the
// same result, instead of two round trips to the database.

/** A calculator link with its installer, active or not. */
export const getCalculatorLink = cache((slug: string) =>
  prisma.calculatorLink.findUnique({
    where: { slug },
    include: {
      installer: {
        select: {
          id: true,
          businessName: true,
          slug: true,
          logoUrl: true,
          region: true,
          phone: true,
          email: true,
        },
      },
    },
  }),
);

/** An active marketer of this installer by their link code, or null. */
export const getActiveMarketer = cache(async (installerId: string, rawCode: string | undefined) => {
  const code = normalizeMemberCode(rawCode);
  if (!code) return null;
  return prisma.member.findFirst({
    where: { code, installerId, role: 'MARKETER', isActive: true },
    select: { name: true, code: true },
  });
});

/** The installer behind a storefront slug. */
export const getStorefrontInstaller = cache((slug: string) =>
  prisma.installer.findUnique({
    where: { slug },
    select: {
      id: true,
      businessName: true,
      logoUrl: true,
      bio: true,
      phone: true,
      email: true,
      region: true,
      calculatorLink: { select: { slug: true, isActive: true } },
    },
  }),
);

/** The products an installer lists on their storefront, newest first. */
export const getStorefrontProducts = cache((installerId: string) =>
  prisma.product.findMany({
    where: { installerId, isAvailable: true },
    orderBy: { createdAt: 'desc' },
  }),
);
