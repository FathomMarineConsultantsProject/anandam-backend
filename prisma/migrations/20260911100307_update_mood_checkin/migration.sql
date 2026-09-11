-- =====================================================
-- UPDATE MOOD CHECK-IN STRUCTURE
-- =====================================================

-- Add type so QUICK and FULL check-ins can use same table
ALTER TABLE "MoodLog"
ADD COLUMN "checkinType" TEXT NOT NULL DEFAULT 'FULL';


-- =====================================================
-- CONVERT LEGACY SINGLE FEELING TO MULTIPLE FEELINGS
-- =====================================================

ALTER TABLE "MoodLog"
ADD COLUMN "feelings" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Preserve any old feeling data
UPDATE "MoodLog"
SET "feelings" = ARRAY["feeling"]
WHERE "feeling" IS NOT NULL
  AND BTRIM("feeling") <> '';


-- =====================================================
-- IDENTIFY OLD QUICK CHECK-INS
-- =====================================================

UPDATE "MoodLog"
SET "checkinType" = 'QUICK'
WHERE "moodScore" IS NOT NULL
  AND "energyLevel" IS NULL
  AND "stressLevel" IS NULL
  AND "hoursOfSleep" IS NULL
  AND "currentWorkload" IS NULL
  AND "additionalThoughts" IS NULL
  AND "journalEntry" IS NULL
  AND (
    "feeling" IS NULL
    OR BTRIM("feeling") = ''
  );


-- Old column is no longer required
ALTER TABLE "MoodLog"
DROP COLUMN "feeling";


-- =====================================================
-- UPDATE USER RELATION TO CASCADE
-- =====================================================

ALTER TABLE "MoodLog"
DROP CONSTRAINT "MoodLog_userId_fkey";

ALTER TABLE "MoodLog"
ADD CONSTRAINT "MoodLog_userId_fkey"
FOREIGN KEY ("userId")
REFERENCES "User"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;


-- =====================================================
-- HISTORY PERFORMANCE
-- =====================================================

CREATE INDEX "MoodLog_userId_loggedAt_idx"
ON "MoodLog"("userId", "loggedAt");