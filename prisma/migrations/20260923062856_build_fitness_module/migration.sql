-- CreateTable
CREATE TABLE "FitnessWorkout" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "shortDescription" TEXT NOT NULL,
    "about" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "youtubeVideoId" TEXT,
    "benefits" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "beforeYouBegin" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "requiredEquipment" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "vrLaunchUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FitnessWorkout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FitnessWorkoutSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workoutId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "progressPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "positionSeconds" INTEGER NOT NULL DEFAULT 0,
    "confirmedEquipment" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FitnessWorkoutSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FitnessChallenge" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "targetValue" INTEGER NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'workouts',
    "period" TEXT NOT NULL DEFAULT 'CALENDAR_MONTH',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "themeKey" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FitnessChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FitnessWorkout_slug_key" ON "FitnessWorkout"("slug");

-- CreateIndex
CREATE INDEX "FitnessWorkout_type_isActive_sortOrder_idx" ON "FitnessWorkout"("type", "isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "FitnessWorkout_category_idx" ON "FitnessWorkout"("category");

-- CreateIndex
CREATE INDEX "FitnessWorkout_difficulty_idx" ON "FitnessWorkout"("difficulty");

-- CreateIndex
CREATE INDEX "FitnessWorkoutSession_userId_status_updatedAt_idx" ON "FitnessWorkoutSession"("userId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "FitnessWorkoutSession_userId_completedAt_idx" ON "FitnessWorkoutSession"("userId", "completedAt");

-- CreateIndex
CREATE INDEX "FitnessWorkoutSession_workoutId_idx" ON "FitnessWorkoutSession"("workoutId");

-- CreateIndex
CREATE INDEX "FitnessChallenge_isActive_sortOrder_idx" ON "FitnessChallenge"("isActive", "sortOrder");

-- AddForeignKey
ALTER TABLE "FitnessWorkoutSession" ADD CONSTRAINT "FitnessWorkoutSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FitnessWorkoutSession" ADD CONSTRAINT "FitnessWorkoutSession_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "FitnessWorkout"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
