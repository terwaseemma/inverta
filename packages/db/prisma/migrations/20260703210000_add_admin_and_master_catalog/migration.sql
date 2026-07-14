-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('INSTALLER', 'ADMIN');

-- AlterTable
ALTER TABLE "Installer" ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'INSTALLER';

-- CreateTable
CREATE TABLE "MasterCatalogItem" (
    "id" TEXT NOT NULL,
    "type" "CatalogItemType" NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "capacity" DECIMAL(12,3) NOT NULL,
    "unit" "CapacityUnit" NOT NULL,
    "voltage" INTEGER,
    "storageKwh" DECIMAL(12,3),
    "chemistry" "BatteryChemistry",
    "priceKobo" INTEGER NOT NULL,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MasterCatalogItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MasterCatalogItem_type_isActive_idx" ON "MasterCatalogItem"("type", "isActive");
