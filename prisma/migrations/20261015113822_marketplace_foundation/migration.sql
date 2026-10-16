-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'PRACTITIONER', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "PractitionerApprovalStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "MarketplaceEnquiryStatus" AS ENUM ('PENDING', 'TIME_PROPOSED', 'RESCHEDULE_REQUESTED', 'CONFIRMED', 'DECLINED', 'CLOSED');

-- CreateEnum
CREATE TYPE "SessionProposalStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'USER';

-- CreateTable
CREATE TABLE "PractitionerProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "practitionerType" TEXT NOT NULL,
    "professionalTitle" TEXT,
    "shortBio" TEXT,
    "about" TEXT,
    "profileImageUrl" TEXT,
    "experienceYears" INTEGER,
    "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "qualificationSummary" TEXT,
    "sessionDurationMinutes" INTEGER NOT NULL DEFAULT 50,
    "sessionPrice" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "acceptingNewClients" BOOLEAN NOT NULL DEFAULT true,
    "approvalStatus" "PractitionerApprovalStatus" NOT NULL DEFAULT 'DRAFT',
    "isVisible" BOOLEAN NOT NULL DEFAULT false,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PractitionerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Specialty" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Specialty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PractitionerSpecialty" (
    "practitionerId" TEXT NOT NULL,
    "specialtyId" TEXT NOT NULL,

    CONSTRAINT "PractitionerSpecialty_pkey" PRIMARY KEY ("practitionerId","specialtyId")
);

-- CreateTable
CREATE TABLE "MarketplaceEnquiry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "practitionerId" TEXT NOT NULL,
    "status" "MarketplaceEnquiryStatus" NOT NULL DEFAULT 'PENDING',
    "supportTopic" TEXT,
    "message" TEXT,
    "preferredDays" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "preferredTimes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "timeZone" TEXT,
    "declinedReason" TEXT,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplaceEnquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionProposal" (
    "id" TEXT NOT NULL,
    "enquiryId" TEXT NOT NULL,
    "proposedStart" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "timeZone" TEXT NOT NULL,
    "sessionType" TEXT NOT NULL DEFAULT 'VIDEO',
    "practitionerMessage" TEXT,
    "userResponseMessage" TEXT,
    "status" "SessionProposalStatus" NOT NULL DEFAULT 'PENDING',
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SessionProposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "enquiryId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "practitionerId" TEXT NOT NULL,
    "scheduledStart" TIMESTAMP(3) NOT NULL,
    "scheduledEnd" TIMESTAMP(3) NOT NULL,
    "timeZone" TEXT NOT NULL,
    "sessionType" TEXT NOT NULL DEFAULT 'VIDEO',
    "status" "AppointmentStatus" NOT NULL DEFAULT 'CONFIRMED',
    "cancelledAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PractitionerProfile_userId_key" ON "PractitionerProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PractitionerProfile_slug_key" ON "PractitionerProfile"("slug");

-- CreateIndex
CREATE INDEX "PractitionerProfile_approvalStatus_isVisible_idx" ON "PractitionerProfile"("approvalStatus", "isVisible");

-- CreateIndex
CREATE INDEX "PractitionerProfile_practitionerType_idx" ON "PractitionerProfile"("practitionerType");

-- CreateIndex
CREATE UNIQUE INDEX "Specialty_slug_key" ON "Specialty"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Specialty_name_key" ON "Specialty"("name");

-- CreateIndex
CREATE INDEX "PractitionerSpecialty_specialtyId_idx" ON "PractitionerSpecialty"("specialtyId");

-- CreateIndex
CREATE INDEX "MarketplaceEnquiry_userId_status_updatedAt_idx" ON "MarketplaceEnquiry"("userId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "MarketplaceEnquiry_practitionerId_status_updatedAt_idx" ON "MarketplaceEnquiry"("practitionerId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "SessionProposal_enquiryId_status_idx" ON "SessionProposal"("enquiryId", "status");

-- CreateIndex
CREATE INDEX "SessionProposal_proposedStart_idx" ON "SessionProposal"("proposedStart");

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_enquiryId_key" ON "Appointment"("enquiryId");

-- CreateIndex
CREATE INDEX "Appointment_userId_status_scheduledStart_idx" ON "Appointment"("userId", "status", "scheduledStart");

-- CreateIndex
CREATE INDEX "Appointment_practitionerId_status_scheduledStart_idx" ON "Appointment"("practitionerId", "status", "scheduledStart");

-- AddForeignKey
ALTER TABLE "PractitionerProfile" ADD CONSTRAINT "PractitionerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PractitionerSpecialty" ADD CONSTRAINT "PractitionerSpecialty_practitionerId_fkey" FOREIGN KEY ("practitionerId") REFERENCES "PractitionerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PractitionerSpecialty" ADD CONSTRAINT "PractitionerSpecialty_specialtyId_fkey" FOREIGN KEY ("specialtyId") REFERENCES "Specialty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceEnquiry" ADD CONSTRAINT "MarketplaceEnquiry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceEnquiry" ADD CONSTRAINT "MarketplaceEnquiry_practitionerId_fkey" FOREIGN KEY ("practitionerId") REFERENCES "PractitionerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionProposal" ADD CONSTRAINT "SessionProposal_enquiryId_fkey" FOREIGN KEY ("enquiryId") REFERENCES "MarketplaceEnquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_enquiryId_fkey" FOREIGN KEY ("enquiryId") REFERENCES "MarketplaceEnquiry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_practitionerId_fkey" FOREIGN KEY ("practitionerId") REFERENCES "PractitionerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
