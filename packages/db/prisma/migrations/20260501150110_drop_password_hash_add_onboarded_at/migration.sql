/*
  Warnings:

  - You are about to drop the column `passwordHash` on the `Installer` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Installer" DROP COLUMN "passwordHash",
ADD COLUMN     "onboardedAt" TIMESTAMP(3);
