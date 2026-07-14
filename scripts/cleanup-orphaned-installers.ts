// Removes Installer rows whose Supabase auth user has been deleted — they
// can never log in, but their profiles/calculators stay publicly visible
// until cleaned up. Cascade removes their catalog, leads, proposals,
// products, and notifications.
//
// The seeded demo installer (authUserId = null) is never touched.
//
// Dry run (default):  npx tsx scripts/cleanup-orphaned-installers.ts
// Actually delete:    npx tsx scripts/cleanup-orphaned-installers.ts --apply
// (load env first:    set -a && . ./.env && set +a)

import { createClient } from '@supabase/supabase-js';
import { prisma } from '@inverta/db';

async function main() {
  const apply = process.argv.includes('--apply');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.');
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Collect every live auth user id (paginated).
  const liveAuthIds = new Set<string>();
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`listUsers failed: ${error.message}`);
    for (const u of data.users) liveAuthIds.add(u.id);
    if (data.users.length < 1000) break;
  }
  console.log(`Live auth users: ${liveAuthIds.size}`);

  const installers = await prisma.installer.findMany({
    where: { authUserId: { not: null } },
    select: {
      id: true,
      authUserId: true,
      businessName: true,
      email: true,
      _count: { select: { leads: true, proposals: true, catalogItems: true, products: true } },
    },
  });

  const orphans = installers.filter((i) => !liveAuthIds.has(i.authUserId!));
  if (orphans.length === 0) {
    console.log('No orphaned installers — nothing to do.');
    return;
  }

  console.log(`\nOrphaned installers (auth user deleted):`);
  for (const o of orphans) {
    console.log(
      `  - ${o.businessName} <${o.email}> — ${o._count.leads} leads, ${o._count.proposals} proposals, ${o._count.catalogItems} catalog items, ${o._count.products} products`,
    );
  }

  if (!apply) {
    console.log('\nDry run — nothing deleted. Re-run with --apply to remove them.');
    return;
  }

  const { count } = await prisma.installer.deleteMany({
    where: { id: { in: orphans.map((o) => o.id) } },
  });
  console.log(`\nDeleted ${count} installer(s) and their related data (cascade).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
