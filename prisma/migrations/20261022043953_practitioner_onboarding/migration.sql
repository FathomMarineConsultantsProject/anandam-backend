-- AlterTable
ALTER TABLE "PractitionerProfile" ADD COLUMN     "facebookUrl" TEXT,
ADD COLUMN     "instagramUrl" TEXT,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "onboardingStep" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "profileImagePathname" TEXT,
ADD COLUMN     "submittedAt" TIMESTAMP(3),
ADD COLUMN     "websiteUrl" TEXT,
ADD COLUMN     "youtubeUrl" TEXT,
ALTER COLUMN "practitionerType" DROP NOT NULL,
ALTER COLUMN "sessionPrice" DROP NOT NULL;

-- CreateTable
CREATE TABLE "PractitionerQualification" (
    "id" TEXT NOT NULL,
    "practitionerId" TEXT NOT NULL,
    "qualificationName" TEXT,
    "institution" TEXT,
    "year" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PractitionerQualification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PractitionerDocument" (
    "id" TEXT NOT NULL,
    "practitionerId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "blobUrl" TEXT NOT NULL,
    "blobPathname" TEXT NOT NULL,
    "documentType" TEXT NOT NULL DEFAULT 'SUPPORTING_DOCUMENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PractitionerDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PractitionerQualification_practitionerId_idx" ON "PractitionerQualification"("practitionerId");

-- CreateIndex
CREATE UNIQUE INDEX "PractitionerDocument_blobPathname_key" ON "PractitionerDocument"("blobPathname");

-- CreateIndex
CREATE INDEX "PractitionerDocument_practitionerId_createdAt_idx" ON "PractitionerDocument"("practitionerId", "createdAt");

-- AddForeignKey
ALTER TABLE "PractitionerQualification" ADD CONSTRAINT "PractitionerQualification_practitionerId_fkey" FOREIGN KEY ("practitionerId") REFERENCES "PractitionerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PractitionerDocument" ADD CONSTRAINT "PractitionerDocument_practitionerId_fkey" FOREIGN KEY ("practitionerId") REFERENCES "PractitionerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
