-- CreateTable
CREATE TABLE "BreathingAudioTrack" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sourceType" TEXT NOT NULL,
    "youtubeVideoId" TEXT,
    "audioUrl" TEXT,
    "thumbnailUrl" TEXT,
    "durationSeconds" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BreathingAudioTrack_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BreathingAudioTrack_slug_key" ON "BreathingAudioTrack"("slug");

-- CreateIndex
CREATE INDEX "BreathingAudioTrack_isActive_sortOrder_idx" ON "BreathingAudioTrack"("isActive", "sortOrder");
