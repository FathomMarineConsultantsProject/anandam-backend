-- =====================================================
-- REDESIGN DAILY PLANNER
-- Preserve existing DailyPlan and Activity data
-- =====================================================


-- =====================================================
-- DROP OLD FOREIGN KEYS
-- They will be recreated with ON DELETE CASCADE
-- =====================================================

ALTER TABLE "Activity"
DROP CONSTRAINT "Activity_dailyPlanId_fkey";

ALTER TABLE "DailyPlan"
DROP CONSTRAINT "DailyPlan_userId_fkey";


-- =====================================================
-- UPDATE ACTIVITY TABLE
--
-- updatedAt must initially be nullable because existing
-- rows already exist.
-- =====================================================

ALTER TABLE "Activity"
ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "note" TEXT,
ADD COLUMN "source" TEXT NOT NULL DEFAULT 'MANUAL',
ADD COLUMN "sourceTemplateId" TEXT,
ADD COLUMN "sourceTemplateType" TEXT,
ADD COLUMN "updatedAt" TIMESTAMP(3);


-- Give existing Activity rows a valid updatedAt value
UPDATE "Activity"
SET "updatedAt" = CURRENT_TIMESTAMP
WHERE "updatedAt" IS NULL;


-- Now it is safe to make updatedAt required
ALTER TABLE "Activity"
ALTER COLUMN "updatedAt" SET NOT NULL;


-- =====================================================
-- UPDATE DAILY PLAN TABLE
-- =====================================================

ALTER TABLE "DailyPlan"
ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "updatedAt" TIMESTAMP(3);


-- Give existing DailyPlan rows a valid updatedAt value
UPDATE "DailyPlan"
SET "updatedAt" = CURRENT_TIMESTAMP
WHERE "updatedAt" IS NULL;


ALTER TABLE "DailyPlan"
ALTER COLUMN "updatedAt" SET NOT NULL;


-- =====================================================
-- SAFELY HANDLE POSSIBLE DUPLICATE DAILY PLANS
--
-- New schema requires only one DailyPlan for:
-- userId + date
--
-- If duplicates exist:
-- 1. Keep one DailyPlan
-- 2. Move all activities to it
-- 3. Preserve a mainFocus if possible
-- 4. Delete the duplicate DailyPlan rows
-- =====================================================


-- Preserve mainFocus from duplicate groups when keeper
-- currently has no mainFocus.
WITH duplicate_groups AS (
    SELECT
        "userId",
        "date",
        MIN("id") AS "keepId",
        MAX("mainFocus")
            FILTER (WHERE "mainFocus" IS NOT NULL)
            AS "preservedFocus"
    FROM "DailyPlan"
    GROUP BY "userId", "date"
    HAVING COUNT(*) > 1
)
UPDATE "DailyPlan" AS dp
SET "mainFocus" =
    COALESCE(
        dp."mainFocus",
        dg."preservedFocus"
    )
FROM duplicate_groups AS dg
WHERE dp."id" = dg."keepId";


-- Move activities from duplicate DailyPlans to keeper
WITH keepers AS (
    SELECT
        "userId",
        "date",
        MIN("id") AS "keepId"
    FROM "DailyPlan"
    GROUP BY "userId", "date"
)
UPDATE "Activity" AS activity
SET "dailyPlanId" = keepers."keepId"
FROM "DailyPlan" AS duplicate_plan
JOIN keepers
    ON keepers."userId" = duplicate_plan."userId"
    AND keepers."date" = duplicate_plan."date"
WHERE activity."dailyPlanId" = duplicate_plan."id"
AND duplicate_plan."id" <> keepers."keepId";


-- Delete duplicate DailyPlan records
WITH keepers AS (
    SELECT
        "userId",
        "date",
        MIN("id") AS "keepId"
    FROM "DailyPlan"
    GROUP BY "userId", "date"
)
DELETE FROM "DailyPlan" AS duplicate_plan
USING keepers
WHERE duplicate_plan."userId" = keepers."userId"
AND duplicate_plan."date" = keepers."date"
AND duplicate_plan."id" <> keepers."keepId";


-- =====================================================
-- CREATE USER DAY TEMPLATE TABLE
-- =====================================================

CREATE TABLE "DayTemplate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DayTemplate_pkey"
    PRIMARY KEY ("id")
);


-- =====================================================
-- CREATE TEMPLATE ACTIVITY TABLE
-- =====================================================

CREATE TABLE "DayTemplateActivity" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "startMinute" INTEGER NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "note" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DayTemplateActivity_pkey"
    PRIMARY KEY ("id")
);


-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX
"DayTemplate_userId_updatedAt_idx"
ON "DayTemplate"("userId", "updatedAt");


CREATE INDEX
"DayTemplateActivity_templateId_order_idx"
ON "DayTemplateActivity"("templateId", "order");


CREATE INDEX
"Activity_dailyPlanId_startTime_idx"
ON "Activity"("dailyPlanId", "startTime");


CREATE INDEX
"DailyPlan_userId_date_idx"
ON "DailyPlan"("userId", "date");


-- Only one DailyPlan per user per day
CREATE UNIQUE INDEX
"DailyPlan_userId_date_key"
ON "DailyPlan"("userId", "date");


-- =====================================================
-- FOREIGN KEYS
-- =====================================================

ALTER TABLE "DailyPlan"
ADD CONSTRAINT "DailyPlan_userId_fkey"
FOREIGN KEY ("userId")
REFERENCES "User"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;


ALTER TABLE "Activity"
ADD CONSTRAINT "Activity_dailyPlanId_fkey"
FOREIGN KEY ("dailyPlanId")
REFERENCES "DailyPlan"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;


ALTER TABLE "DayTemplate"
ADD CONSTRAINT "DayTemplate_userId_fkey"
FOREIGN KEY ("userId")
REFERENCES "User"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;


ALTER TABLE "DayTemplateActivity"
ADD CONSTRAINT "DayTemplateActivity_templateId_fkey"
FOREIGN KEY ("templateId")
REFERENCES "DayTemplate"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;