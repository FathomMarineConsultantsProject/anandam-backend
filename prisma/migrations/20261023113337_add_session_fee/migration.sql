-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'INR',
ADD COLUMN     "sessionFee" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "SessionProposal" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'INR',
ADD COLUMN     "sessionFee" DECIMAL(10,2);
