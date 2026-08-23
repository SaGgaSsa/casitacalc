/*
  Warnings:

  - You are about to drop the `PriceList` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "PriceCollectionStatus" AS ENUM ('DRAFT', 'VALIDATED', 'PUBLISHED', 'REJECTED', 'FAILED');

-- CreateEnum
CREATE TYPE "ReferencePriceStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'REJECTED');

-- AlterTable
ALTER TABLE "CalculationResultItem" ADD COLUMN     "fechaPrecio" TIMESTAMP(3),
ADD COLUMN     "fuentePrecio" TEXT,
ADD COLUMN     "regionPrecio" TEXT;

-- AlterTable
ALTER TABLE "Project" ALTER COLUMN "ownerTokenHash" DROP DEFAULT;

-- DropTable
DROP TABLE "PriceList";

-- CreateTable
CREATE TABLE "PriceSource" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PriceSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceCollection" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT,
    "region" TEXT NOT NULL,
    "collectedAt" TIMESTAMP(3) NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "originalFilename" TEXT NOT NULL,
    "status" "PriceCollectionStatus" NOT NULL DEFAULT 'DRAFT',
    "totalRows" INTEGER NOT NULL,
    "acceptedRows" INTEGER NOT NULL,
    "rejectedRows" INTEGER NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "PriceCollection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceObservation" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "externalId" TEXT,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "rawPrice" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "packageQuantity" DECIMAL(12,4) NOT NULL,
    "packageUnit" TEXT NOT NULL,
    "normalizedUnitPrice" DECIMAL(14,2) NOT NULL,
    "normalizedUnit" TEXT NOT NULL,
    "seller" TEXT,
    "brand" TEXT,
    "accepted" BOOLEAN NOT NULL,
    "rejectionReason" TEXT,
    "collectedAt" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,
    "dedupeHash" TEXT NOT NULL,

    CONSTRAINT "PriceObservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialReferencePrice" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "sourceId" TEXT,
    "region" TEXT NOT NULL,
    "price" DECIMAL(14,2) NOT NULL,
    "sampleSize" INTEGER NOT NULL,
    "insufficientSample" BOOLEAN NOT NULL DEFAULT false,
    "collectionId" TEXT,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "status" "ReferencePriceStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaterialReferencePrice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PriceSource_code_key" ON "PriceSource"("code");

-- CreateIndex
CREATE INDEX "PriceCollection_status_idx" ON "PriceCollection"("status");

-- CreateIndex
CREATE INDEX "PriceCollection_sourceId_idx" ON "PriceCollection"("sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "PriceObservation_dedupeHash_key" ON "PriceObservation"("dedupeHash");

-- CreateIndex
CREATE INDEX "PriceObservation_collectionId_idx" ON "PriceObservation"("collectionId");

-- CreateIndex
CREATE INDEX "PriceObservation_materialId_idx" ON "PriceObservation"("materialId");

-- CreateIndex
CREATE INDEX "MaterialReferencePrice_materialId_region_status_idx" ON "MaterialReferencePrice"("materialId", "region", "status");

-- CreateIndex
CREATE INDEX "MaterialReferencePrice_collectionId_idx" ON "MaterialReferencePrice"("collectionId");

-- AddForeignKey
ALTER TABLE "PriceCollection" ADD CONSTRAINT "PriceCollection_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "PriceSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceObservation" ADD CONSTRAINT "PriceObservation_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "PriceCollection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceObservation" ADD CONSTRAINT "PriceObservation_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceObservation" ADD CONSTRAINT "PriceObservation_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "PriceSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialReferencePrice" ADD CONSTRAINT "MaterialReferencePrice_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialReferencePrice" ADD CONSTRAINT "MaterialReferencePrice_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "PriceSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialReferencePrice" ADD CONSTRAINT "MaterialReferencePrice_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "PriceCollection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
