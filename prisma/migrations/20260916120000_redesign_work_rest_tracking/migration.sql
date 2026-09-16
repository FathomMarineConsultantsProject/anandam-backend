-- =====================================================
-- REDESIGN WORK / REST TRACKING
-- =====================================================

-- Add the new 48-slot multi-status array
ALTER TABLE "DailyWorkHours"
ADD COLUMN "statusBlocks" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];


-- =====================================================
-- PRESERVE EXISTING BOOLEAN GRID DATA
--
-- Old:
-- true  = WORK
-- false = previously blank/rest/unknown
--
-- Because false was also used for untouched slots,
-- convert it to UNRECORDED rather than REST.
-- =====================================================

UPDATE "DailyWorkHours"
SET "statusBlocks" = ARRAY(
    SELECT CASE
        WHEN block = TRUE THEN 'WORK'
        ELSE 'UNRECORDED'
    END
    FROM unnest("workBlocks") AS t(block)
);


-- Remove old Boolean grid
ALTER TABLE "DailyWorkHours"
DROP COLUMN "workBlocks";


-- =====================================================
-- CREATE WORK SESSION TABLE
-- =====================================================

CREATE TABLE "WorkSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "shipLocation" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "source" TEXT NOT NULL DEFAULT 'LIVE',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkSession_pkey"
    PRIMARY KEY ("id")
);


-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX "DailyWorkHours_userId_date_idx"
ON "DailyWorkHours"("userId", "date");

CREATE INDEX "WorkSession_userId_startedAt_idx"
ON "WorkSession"("userId", "startedAt");

CREATE INDEX "WorkSession_userId_status_idx"
ON "WorkSession"("userId", "status");


-- =====================================================
-- FOREIGN KEY
-- =====================================================

ALTER TABLE "WorkSession"
ADD CONSTRAINT "WorkSession_userId_fkey"
FOREIGN KEY ("userId")
REFERENCES "User"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;