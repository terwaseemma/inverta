// Applies a Prisma migration through the TRANSACTION pooler (port 6543) and
// records it in _prisma_migrations. Use when `prisma migrate dev` can't reach
// the session pooler (port 5432) — common on networks that block it.
//
//   set -a && . ./.env && set +a
//   npx tsx scripts/apply-migration-via-pooler.ts 20260704120000_add_system_voltage
//
// The SQL must be plain DDL (no dollar-quoted bodies) — statements are split
// on semicolons after comment lines are stripped.

import { createHash, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { prisma } from '@inverta/db';

async function main() {
  const name = process.argv[2];
  if (!name) throw new Error('Usage: npx tsx scripts/apply-migration-via-pooler.ts <migration_folder_name>');

  const file = `packages/db/prisma/migrations/${name}/migration.sql`;
  const sql = readFileSync(file, 'utf8');
  const checksum = createHash('sha256').update(sql).digest('hex');

  const already = await prisma.$queryRawUnsafe<{ id: string }[]>(
    `SELECT id FROM "_prisma_migrations" WHERE migration_name = $1`,
    name,
  );
  if (already.length > 0) {
    console.log('Migration already recorded — nothing to do.');
    return;
  }

  const statements = sql
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const stmt of statements) {
    console.log('Executing:', stmt.split('\n')[0]?.slice(0, 70), '…');
    await prisma.$executeRawUnsafe(stmt);
  }

  await prisma.$executeRawUnsafe(
    `INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
     VALUES ($1, $2, now(), $3, NULL, NULL, now(), 1)`,
    randomUUID(),
    checksum,
    name,
  );

  console.log(`✓ ${name} applied and recorded.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
