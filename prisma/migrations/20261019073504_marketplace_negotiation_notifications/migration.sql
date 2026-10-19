-- CreateEnum
CREATE TYPE "SessionProposalAuthor" AS ENUM ('USER', 'PRACTITIONER');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('NEW_ENQUIRY', 'ENQUIRY_ACCEPTED', 'ENQUIRY_DECLINED', 'NEW_TIME_PROPOSED', 'RESCHEDULE_REQUESTED', 'SESSION_CONFIRMED', 'PROPOSAL_DECLINED');

-- AlterTable
ALTER TABLE "MarketplaceEnquiry" ADD COLUMN     "preferredLanguage" TEXT,
ADD COLUMN     "requestedEnd" TIMESTAMP(3),
ADD COLUMN     "requestedStart" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "SessionProposal" ADD COLUMN     "proposedBy" "SessionProposalAuthor" NOT NULL DEFAULT 'PRACTITIONER';

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_createdAt_idx" ON "Notification"("userId", "isRead", "createdAt");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
