/*
  Warnings:

  - A unique constraint covering the columns `[livekitRoomName]` on the table `Appointment` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "callEndedAt" TIMESTAMP(3),
ADD COLUMN     "callStartedAt" TIMESTAMP(3),
ADD COLUMN     "livekitRoomName" TEXT,
ADD COLUMN     "practitionerJoinedAt" TIMESTAMP(3),
ADD COLUMN     "userJoinedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_livekitRoomName_key" ON "Appointment"("livekitRoomName");
