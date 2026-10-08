-- CreateTable
CREATE TABLE "SleepAudioTrack" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sourceType" TEXT NOT NULL DEFAULT 'YOUTUBE',
    "youtubeVideoId" TEXT,
    "sourceUrl" TEXT,
    "audioUrl" TEXT,
    "frequencyHz" DOUBLE PRECISION,
    "frequencyLabel" TEXT,
    "brainwaveBand" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SleepAudioTrack_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SleepAudioTrack_slug_key" ON "SleepAudioTrack"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "SleepAudioTrack_youtubeVideoId_key" ON "SleepAudioTrack"("youtubeVideoId");

-- CreateIndex
CREATE INDEX "SleepAudioTrack_isActive_sortOrder_idx" ON "SleepAudioTrack"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "SleepAudioTrack_frequencyHz_idx" ON "SleepAudioTrack"("frequencyHz");
