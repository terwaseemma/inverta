-- Team members: an installer account can now have several logins.
--
-- Until now one Supabase user mapped to exactly one Installer through the
-- unique Installer.authUserId column, and that login saw everything. Member
-- inserts a user layer beneath the tenant: each login is a Member with a role,
-- OWNER (full access) or MARKETER (their own leads through their own link).
--
-- Purely additive. Installer.authUserId is left in place as a fallback while
-- accounts converge, and no existing column changes.

-- CreateEnum
CREATE TYPE "MemberRole" AS ENUM ('OWNER', 'MARKETER');

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "sourcedByMemberId" TEXT;

-- CreateTable
CREATE TABLE "Member" (
    "id" TEXT NOT NULL,
    "installerId" TEXT NOT NULL,
    "authUserId" TEXT,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "role" "MemberRole" NOT NULL DEFAULT 'MARKETER',
    "code" TEXT,
    "inviteToken" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Member_authUserId_key" ON "Member"("authUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Member_code_key" ON "Member"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Member_inviteToken_key" ON "Member"("inviteToken");

-- CreateIndex
CREATE INDEX "Member_installerId_idx" ON "Member"("installerId");

-- CreateIndex
CREATE UNIQUE INDEX "Member_installerId_email_key" ON "Member"("installerId", "email");

-- CreateIndex
CREATE INDEX "Lead_sourcedByMemberId_idx" ON "Lead"("sourcedByMemberId");

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_installerId_fkey" FOREIGN KEY ("installerId") REFERENCES "Installer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_sourcedByMemberId_fkey" FOREIGN KEY ("sourcedByMemberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;



-- Backfill: every existing installer login becomes the OWNER member of its own
-- account, so identity resolves through Member from the first request after
-- deploy and current users notice nothing. Installers with no login (a seeded
-- tenant) get no row, matching what they could do before.
INSERT INTO "Member" ("id", "installerId", "authUserId", "email", "name", "phone", "role", "invitedAt", "acceptedAt", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, i."id", i."authUserId", i."email", i."contactName", i."phone", 'OWNER'::"MemberRole", i."createdAt", i."createdAt", now(), now()
FROM "Installer" i
WHERE i."authUserId" IS NOT NULL;
