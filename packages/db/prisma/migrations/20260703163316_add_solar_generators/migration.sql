-- AlterEnum
ALTER TYPE "CatalogItemType" ADD VALUE 'GENERATOR';

-- AlterTable
ALTER TABLE "CatalogItem" ADD COLUMN     "storageKwh" DECIMAL(12,3);
