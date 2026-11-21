-- CreateEnum
CREATE TYPE "ResortPropertyStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'UNPUBLISHED');

-- CreateEnum
CREATE TYPE "ResortImageKind" AS ENUM ('PROFILE', 'COVER', 'PROPERTY', 'ROOM');

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'RESORT_OWNER';

-- CreateTable
CREATE TABLE "ResortOwnerProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResortOwnerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResortProperty" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "ResortPropertyStatus" NOT NULL DEFAULT 'DRAFT',
    "onboardingStep" INTEGER NOT NULL DEFAULT 1,
    "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "name" TEXT,
    "resortRating" TEXT,
    "websiteUrl" TEXT,
    "propertyType" TEXT,
    "description" TEXT,
    "country" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "stateRegion" TEXT,
    "postalCode" TEXT,
    "googleMapsUrl" TEXT,
    "amenities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "contactName" TEXT,
    "enquiryEmail" TEXT,
    "phoneNumber" TEXT,
    "smokingPolicy" TEXT,
    "petsPolicy" TEXT,
    "alcoholPolicy" TEXT,
    "additionalRules" TEXT,
    "confirmedAccurate" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResortProperty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResortRoomType" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "maxAdults" INTEGER NOT NULL,
    "maxChildren" INTEGER NOT NULL,
    "features" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "includedMeals" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "basePrice" DECIMAL(12,2),
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResortRoomType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResortRoomBed" (
    "id" TEXT NOT NULL,
    "roomTypeId" TEXT NOT NULL,
    "bedType" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "ResortRoomBed_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResortImage" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "roomTypeId" TEXT,
    "kind" "ResortImageKind" NOT NULL,
    "url" TEXT NOT NULL,
    "pathname" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResortImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ResortOwnerProfile_userId_key" ON "ResortOwnerProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ResortProperty_slug_key" ON "ResortProperty"("slug");

-- CreateIndex
CREATE INDEX "ResortProperty_ownerId_updatedAt_idx" ON "ResortProperty"("ownerId", "updatedAt");

-- CreateIndex
CREATE INDEX "ResortProperty_status_publishedAt_idx" ON "ResortProperty"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "ResortProperty_propertyType_city_idx" ON "ResortProperty"("propertyType", "city");

-- CreateIndex
CREATE INDEX "ResortRoomType_propertyId_createdAt_idx" ON "ResortRoomType"("propertyId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ResortRoomBed_roomTypeId_bedType_key" ON "ResortRoomBed"("roomTypeId", "bedType");

-- CreateIndex
CREATE UNIQUE INDEX "ResortImage_pathname_key" ON "ResortImage"("pathname");

-- CreateIndex
CREATE INDEX "ResortImage_propertyId_kind_sortOrder_idx" ON "ResortImage"("propertyId", "kind", "sortOrder");

-- CreateIndex
CREATE INDEX "ResortImage_roomTypeId_sortOrder_idx" ON "ResortImage"("roomTypeId", "sortOrder");

-- AddForeignKey
ALTER TABLE "ResortOwnerProfile" ADD CONSTRAINT "ResortOwnerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResortProperty" ADD CONSTRAINT "ResortProperty_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "ResortOwnerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResortRoomType" ADD CONSTRAINT "ResortRoomType_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "ResortProperty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResortRoomBed" ADD CONSTRAINT "ResortRoomBed_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "ResortRoomType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResortImage" ADD CONSTRAINT "ResortImage_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "ResortProperty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResortImage" ADD CONSTRAINT "ResortImage_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "ResortRoomType"("id") ON DELETE CASCADE ON UPDATE CASCADE;
