// One-off backfill: copies display name / phone / business name from the
// Installer table into Supabase auth user_metadata, so the Auth dashboard
// shows who each user is. Safe to re-run — it only overwrites the four
// metadata keys it owns.
//
// Run from the repo root with env loaded:
//   set -a && . ./.env && set +a && npx tsx scripts/backfill-auth-user-metadata.ts

import { createClient } from '@supabase/supabase-js';
import { prisma } from '@inverta/db';

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.');
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const installers = await prisma.installer.findMany({
    where: { authUserId: { not: null } },
    select: {
      authUserId: true,
      contactName: true,
      phone: true,
      businessName: true,
      email: true,
    },
  });

  console.log(`Backfilling ${installers.length} auth user(s)…`);

  for (const inst of installers) {
    const { error } = await admin.auth.admin.updateUserById(inst.authUserId!, {
      user_metadata: {
        display_name: inst.contactName,
        full_name: inst.contactName,
        phone: inst.phone,
        business_name: inst.businessName,
      },
    });
    console.log(
      error
        ? `  ✗ ${inst.email}: ${error.message}`
        : `  ✓ ${inst.email} → ${inst.contactName} (${inst.businessName})`,
    );
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
