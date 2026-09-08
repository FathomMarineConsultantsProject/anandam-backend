-- Reconcile schema changes that already exist in the live database.
-- This migration will NOT be executed on the existing database.
-- It will be marked as already applied.

-- Remove old WorkShift table
DROP TABLE "WorkShift";

-- =====================================================
-- USER CHANGES
-- =====================================================

ALTER TABLE "User"
ADD COLUMN "contactNumber" TEXT,
ADD COLUMN "emergencyContact" TEXT,
ADD COLUMN "homeCountry" TEXT;


-- =====================================================
-- MOOD LOG CHANGES
-- =====================================================

ALTER TABLE "MoodLog"
ADD COLUMN "hoursOfSleep" DOUBLE PRECISION,
ADD COLUMN "currentWorkload" TEXT,
ADD COLUMN "feeling" TEXT,
ADD COLUMN "additionalThoughts" TEXT,
ADD COLUMN "journalEntry" TEXT;

ALTER TABLE "MoodLog"
ALTER COLUMN "moodScore" DROP NOT NULL,
ALTER COLUMN "energyLevel" DROP NOT NULL,
ALTER COLUMN "stressLevel" DROP NOT NULL;


-- =====================================================
-- HABIT RELATION UPDATE
-- =====================================================

ALTER TABLE "Habit"
DROP CONSTRAINT "Habit_userId_fkey";

ALTER TABLE "Habit"
ADD CONSTRAINT "Habit_userId_fkey"
FOREIGN KEY ("userId")
REFERENCES "User"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;


-- =====================================================
-- HABIT COMPLETION UPDATE
-- =====================================================

ALTER TABLE "HabitCompletion"
DROP CONSTRAINT "HabitCompletion_habitId_fkey";

CREATE UNIQUE INDEX "HabitCompletion_habitId_completedDate_key"
ON "HabitCompletion"("habitId", "completedDate");

ALTER TABLE "HabitCompletion"
ADD CONSTRAINT "HabitCompletion_habitId_fkey"
FOREIGN KEY ("habitId")
REFERENCES "Habit"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;


-- =====================================================
-- DAILY WORK HOURS
-- =====================================================

CREATE TABLE "DailyWorkHours" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "workBlocks" BOOLEAN[] NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyWorkHours_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DailyWorkHours_userId_date_key"
ON "DailyWorkHours"("userId", "date");

ALTER TABLE "DailyWorkHours"
ADD CONSTRAINT "DailyWorkHours_userId_fkey"
FOREIGN KEY ("userId")
REFERENCES "User"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;