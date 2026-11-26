-- CreateEnum
CREATE TYPE "AccessoryRule" AS ENUM ('PER_INSTALL', 'PER_PANEL', 'PER_BATTERY', 'PER_CABLE_YARD');

-- CreateEnum
CREATE TYPE "RoofType" AS ENUM ('METAL', 'STONE_COATED', 'CONCRETE', 'GROUND');

-- AlterTable
ALTER TABLE "CatalogItem" ADD COLUMN "qtyRule" "AccessoryRule" NOT NULL DEFAULT 'PER_INSTALL',
ADD COLUMN "qtyPer" DOUBLE PRECISION NOT NULL DEFAULT 1,
ADD COLUMN "minKva" DOUBLE PRECISION,
ADD COLUMN "maxKva" DOUBLE PRECISION,
ADD COLUMN "roofTypes" "RoofType"[] DEFAULT ARRAY[]::"RoofType"[],
ADD COLUMN "itemized" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "MasterCatalogItem" ADD COLUMN "qtyRule" "AccessoryRule" NOT NULL DEFAULT 'PER_INSTALL',
ADD COLUMN "qtyPer" DOUBLE PRECISION NOT NULL DEFAULT 1,
ADD COLUMN "minKva" DOUBLE PRECISION,
ADD COLUMN "maxKva" DOUBLE PRECISION,
ADD COLUMN "roofTypes" "RoofType"[] DEFAULT ARRAY[]::"RoofType"[],
ADD COLUMN "itemized" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Installer" ADD COLUMN "cableYardsBungalow" INTEGER NOT NULL DEFAULT 25,
ADD COLUMN "cableYardsOneStorey" INTEGER NOT NULL DEFAULT 35,
ADD COLUMN "cableYardsTwoStorey" INTEGER NOT NULL DEFAULT 45,
ADD COLUMN "cableYardsThreePlus" INTEGER NOT NULL DEFAULT 55;

-- Accessories already named "per panel" were always meant to scale with the
-- array; until now the engine charged them once.
UPDATE "CatalogItem" SET "qtyRule" = 'PER_PANEL'
WHERE "type" = 'ACCESSORY' AND "model" ILIKE '%per panel%';
UPDATE "MasterCatalogItem" SET "qtyRule" = 'PER_PANEL'
WHERE "type" = 'ACCESSORY' AND "model" ILIKE '%per panel%';
