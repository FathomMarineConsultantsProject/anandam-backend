-- AlterTable
ALTER TABLE "SleepAudioTrack" ADD COLUMN     "category" TEXT NOT NULL DEFAULT 'SLEEP_SOUND';

-- CreateIndex
CREATE INDEX "SleepAudioTrack_category_isActive_sortOrder_idx" ON "SleepAudioTrack"("category", "isActive", "sortOrder");
