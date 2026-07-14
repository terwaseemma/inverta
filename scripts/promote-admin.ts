// Promote (or demote) an installer account to platform admin.
//
//   set -a && . ./.env && set +a
//   npx tsx scripts/promote-admin.ts you@example.com          # promote
//   npx tsx scripts/promote-admin.ts you@example.com --demote # demote

import { prisma } from '@inverta/db';

async function main() {
  const email = process.argv[2];
  const demote = process.argv.includes('--demote');
  if (!email) {
    throw new Error('Usage: npx tsx scripts/promote-admin.ts <email> [--demote]');
  }

  const installer = await prisma.installer.findUnique({
    where: { email: email.toLowerCase() },
    select: { id: true, businessName: true, role: true },
  });
  if (!installer) {
    throw new Error(`No installer found with email ${email}`);
  }

  const role = demote ? 'INSTALLER' : 'ADMIN';
  await prisma.installer.update({ where: { id: installer.id }, data: { role } });
  console.log(`✓ ${installer.businessName} <${email}> is now ${role}`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
