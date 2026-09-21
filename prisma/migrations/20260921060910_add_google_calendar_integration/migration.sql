-- AlterTable
ALTER TABLE "Activity" ADD COLUMN     "googleCalendarId" TEXT,
ADD COLUMN     "googleEventId" TEXT,
ADD COLUMN     "googleSyncError" TEXT,
ADD COLUMN     "googleSyncStatus" TEXT NOT NULL DEFAULT 'NOT_SYNCED',
ADD COLUMN     "googleSyncedAt" TIMESTAMP(3),
ADD COLUMN     "timeZone" TEXT;

-- CreateTable
CREATE TABLE "GoogleCalendarConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "googleEmail" TEXT,
    "calendarId" TEXT NOT NULL DEFAULT 'primary',
    "timeZone" TEXT NOT NULL DEFAULT 'UTC',
    "refreshTokenEncrypted" TEXT NOT NULL,
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "emailReminderMinutes" INTEGER NOT NULL DEFAULT 30,
    "popupReminderMinutes" INTEGER NOT NULL DEFAULT 10,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoogleCalendarConnection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GoogleCalendarConnection_userId_key" ON "GoogleCalendarConnection"("userId");

-- CreateIndex
CREATE INDEX "Activity_googleEventId_idx" ON "Activity"("googleEventId");

-- AddForeignKey
ALTER TABLE "GoogleCalendarConnection" ADD CONSTRAINT "GoogleCalendarConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
