-- CreateEnum
CREATE TYPE "BusinessType" AS ENUM ('INSTALLER', 'VENDOR', 'BOTH');

-- CreateEnum
CREATE TYPE "CatalogItemType" AS ENUM ('INVERTER', 'BATTERY', 'PANEL', 'ACCESSORY');

-- CreateEnum
CREATE TYPE "BatteryChemistry" AS ENUM ('LITHIUM', 'AGM', 'GEL');

-- CreateEnum
CREATE TYPE "CapacityUnit" AS ENUM ('KVA', 'KWH', 'AH', 'W', 'UNIT');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'VIEWED', 'PROPOSAL_SENT', 'CONVERTED', 'LOST');

-- CreateEnum
CREATE TYPE "ProposalStatus" AS ENUM ('DRAFT', 'SENT', 'VIEWED', 'ACCEPTED', 'DECLINED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('NEW_LEAD', 'PROPOSAL_VIEWED', 'PROPOSAL_ACCEPTED', 'SYSTEM');

-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('GENERATOR', 'KIT', 'PART');

-- CreateEnum
CREATE TYPE "AppliancePresetCategory" AS ENUM ('LIGHTING', 'COOLING', 'KITCHEN', 'ENTERTAINMENT', 'COMPUTING', 'OTHER');

-- CreateTable
CREATE TABLE "Installer" (
    "id" TEXT NOT NULL,
    "authUserId" TEXT,
    "businessName" TEXT NOT NULL,
    "businessType" "BusinessType" NOT NULL DEFAULT 'INSTALLER',
    "slug" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "passwordHash" TEXT,
    "region" TEXT NOT NULL,
    "logoUrl" TEXT,
    "websiteUrl" TEXT,
    "bio" TEXT,
    "address" TEXT,
    "markupPercent" INTEGER NOT NULL DEFAULT 15,
    "installationFeeKobo" INTEGER NOT NULL DEFAULT 0,
    "installationFeePercent" INTEGER,
    "emailVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Installer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogItem" (
    "id" TEXT NOT NULL,
    "installerId" TEXT NOT NULL,
    "type" "CatalogItemType" NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "capacity" DECIMAL(12,3) NOT NULL,
    "unit" "CapacityUnit" NOT NULL,
    "voltage" INTEGER,
    "chemistry" "BatteryChemistry",
    "priceKobo" INTEGER NOT NULL,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalculatorLink" (
    "id" TEXT NOT NULL,
    "installerId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CalculatorLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "installerId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "referralSource" TEXT,
    "inputSnapshot" JSONB NOT NULL,
    "resultSnapshot" JSONB NOT NULL,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "notes" TEXT,
    "submittedIp" TEXT,
    "submittedUserAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Proposal" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "installerId" TEXT NOT NULL,
    "pdfUrl" TEXT,
    "pdfObjectKey" TEXT,
    "totalKobo" INTEGER NOT NULL,
    "validUntil" TIMESTAMP(3),
    "customMessage" TEXT,
    "status" "ProposalStatus" NOT NULL DEFAULT 'DRAFT',
    "sentAt" TIMESTAMP(3),
    "viewedAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Proposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProposalLineItem" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "quantity" INTEGER NOT NULL,
    "unitPriceKobo" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProposalLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppliancePreset" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "defaultWattageW" INTEGER NOT NULL,
    "category" "AppliancePresetCategory" NOT NULL,

    CONSTRAINT "AppliancePreset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "installerId" TEXT NOT NULL,
    "type" "ProductType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priceKobo" INTEGER NOT NULL,
    "imageUrl" TEXT,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "installerId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "linkUrl" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Installer_authUserId_key" ON "Installer"("authUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Installer_slug_key" ON "Installer"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Installer_email_key" ON "Installer"("email");

-- CreateIndex
CREATE INDEX "Installer_slug_idx" ON "Installer"("slug");

-- CreateIndex
CREATE INDEX "CatalogItem_installerId_type_idx" ON "CatalogItem"("installerId", "type");

-- CreateIndex
CREATE INDEX "CatalogItem_installerId_isActive_idx" ON "CatalogItem"("installerId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "CalculatorLink_installerId_key" ON "CalculatorLink"("installerId");

-- CreateIndex
CREATE UNIQUE INDEX "CalculatorLink_slug_key" ON "CalculatorLink"("slug");

-- CreateIndex
CREATE INDEX "Lead_installerId_status_idx" ON "Lead"("installerId", "status");

-- CreateIndex
CREATE INDEX "Lead_installerId_createdAt_idx" ON "Lead"("installerId", "createdAt");

-- CreateIndex
CREATE INDEX "Proposal_installerId_status_idx" ON "Proposal"("installerId", "status");

-- CreateIndex
CREATE INDEX "Proposal_leadId_idx" ON "Proposal"("leadId");

-- CreateIndex
CREATE INDEX "ProposalLineItem_proposalId_idx" ON "ProposalLineItem"("proposalId");

-- CreateIndex
CREATE UNIQUE INDEX "AppliancePreset_name_key" ON "AppliancePreset"("name");

-- CreateIndex
CREATE INDEX "Product_installerId_isAvailable_idx" ON "Product"("installerId", "isAvailable");

-- CreateIndex
CREATE INDEX "Notification_installerId_read_idx" ON "Notification"("installerId", "read");

-- CreateIndex
CREATE INDEX "Notification_installerId_createdAt_idx" ON "Notification"("installerId", "createdAt");

-- AddForeignKey
ALTER TABLE "CatalogItem" ADD CONSTRAINT "CatalogItem_installerId_fkey" FOREIGN KEY ("installerId") REFERENCES "Installer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalculatorLink" ADD CONSTRAINT "CalculatorLink_installerId_fkey" FOREIGN KEY ("installerId") REFERENCES "Installer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_installerId_fkey" FOREIGN KEY ("installerId") REFERENCES "Installer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_installerId_fkey" FOREIGN KEY ("installerId") REFERENCES "Installer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProposalLineItem" ADD CONSTRAINT "ProposalLineItem_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_installerId_fkey" FOREIGN KEY ("installerId") REFERENCES "Installer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_installerId_fkey" FOREIGN KEY ("installerId") REFERENCES "Installer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
