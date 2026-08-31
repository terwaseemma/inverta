// Removes the seeded demo tenant ("Demo Solar Co.", demo@inverta.app) and
// everything hanging off it. Its calculator is publicly reachable at
// /calc/demo-solar, so on a production database it is live sample data
// sitting alongside real installers.
//
// The orphan cleanup script deliberately skips this row — it only removes
// installers whose Supabase auth user was deleted, and the demo never had
// one. This script is the counterpart for that gap.
//
// Cascade removes its catalog, calculator link, leads, proposals, products
// and notifications. Leads are printed before deletion because they are the
// one thing here that could be a real person: anyone who found the public
// demo link could have submitted through it.
//
// Dry run (default):  npx tsx scripts/cleanup-demo-installer.ts
// Actually delete:    npx tsx scripts/cleanup-demo-installer.ts --apply
//
// Re-running `npm run db:seed` recreates it — the seed upserts on the email.

import { prisma } from '@inverta/db';

const DEMO_EMAIL = 'demo@inverta.app';

async function main() {
  const apply = process.argv.includes('--apply');

  const demo = await prisma.installer.findUnique({
    where: { email: DEMO_EMAIL },
    select: {
      id: true,
      businessName: true,
      slug: true,
      authUserId: true,
      _count: {
        select: {
          catalogItems: true,
          leads: true,
          proposals: true,
          products: true,
          notifications: true,
        },
      },
    },
  });

  if (!demo) {
    console.log(`No installer with email ${DEMO_EMAIL} — nothing to do.`);
    return;
  }

  // A real person may have claimed this row at some point. The seeded demo
  // has no auth user by definition, so anything else is not ours to delete.
  if (demo.authUserId !== null) {
    console.error(
      `REFUSING: ${demo.businessName} <${DEMO_EMAIL}> has a Supabase auth user ` +
        `(${demo.authUserId}), so it is a real account rather than the seeded demo. ` +
        `Delete it by hand if that is genuinely what you want.`,
    );
    process.exitCode = 1;
    return;
  }

  const c = demo._count;
  console.log(`${demo.businessName}  (/calc/${demo.slug})  <${DEMO_EMAIL}>`);
  console.log(
    `  cascade will remove: ${c.catalogItems} catalog items, ${c.leads} leads, ` +
      `${c.proposals} proposals, ${c.products} store products, ` +
      `${c.notifications} notifications, and the calculator link.`,
  );

  if (c.leads > 0) {
    const leads = await prisma.lead.findMany({
      where: { installerId: demo.id },
      orderBy: { createdAt: 'asc' },
      select: {
        customerName: true,
        customerEmail: true,
        customerPhone: true,
        createdAt: true,
        submittedIp: true,
      },
    });
    console.log('\n  Leads that will be destroyed — check none of these is a real prospect:');
    for (const l of leads) {
      console.log(
        `    ${l.createdAt.toISOString().slice(0, 16).replace('T', ' ')}  ` +
          `${l.customerName} <${l.customerEmail}> ${l.customerPhone}  ` +
          `from ${l.submittedIp ?? 'unknown IP'}`,
      );
    }
  }

  if (!apply) {
    console.log('\nDry run — nothing deleted. Re-run with --apply to remove it.');
    return;
  }

  await prisma.installer.delete({ where: { id: demo.id } });
  console.log(`\nDeleted ${demo.businessName} and its related data (cascade).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
