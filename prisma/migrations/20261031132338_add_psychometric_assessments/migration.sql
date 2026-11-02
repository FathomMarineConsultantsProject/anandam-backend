-- CreateEnum
CREATE TYPE "PsychometricTestType" AS ENUM ('MARITIME_HUMAN_PERFORMANCE', 'BIG_FIVE', 'PERSONALITY_16PF', 'MOTIVATION_VALUES');

-- CreateEnum
CREATE TYPE "PsychometricQuestionType" AS ENUM ('MULTIPLE_CHOICE', 'LIKERT_5');

-- CreateEnum
CREATE TYPE "PsychometricAttemptStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'ABANDONED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PsychometricSectionCode" AS ENUM ('PJS', 'PLA', 'SHF');

-- CreateTable
CREATE TABLE "PsychometricTest" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "PsychometricTestType" NOT NULL,
    "firstAttemptFree" BOOLEAN NOT NULL DEFAULT true,
    "repeatTokenCost" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PsychometricTest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PsychometricSection" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "code" "PsychometricSectionCode" NOT NULL,
    "title" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "questionsPerAttempt" INTEGER NOT NULL DEFAULT 6,
    "sortOrder" INTEGER NOT NULL,
    "isLockedAfterSubmit" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PsychometricSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PsychometricQuestion" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "sectionId" TEXT,
    "itemCode" TEXT,
    "domain" TEXT,
    "competency" TEXT,
    "questionText" TEXT NOT NULL,
    "questionType" "PsychometricQuestionType" NOT NULL,
    "optionA" TEXT,
    "optionB" TEXT,
    "optionC" TEXT,
    "optionD" TEXT,
    "correctOption" TEXT,
    "reverseScored" BOOLEAN NOT NULL DEFAULT false,
    "traitKey" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PsychometricQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PsychometricAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "status" "PsychometricAttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "tokenCost" INTEGER NOT NULL DEFAULT 0,
    "usedFreeAttempt" BOOLEAN NOT NULL DEFAULT false,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "score" INTEGER,
    "maxScore" INTEGER,
    "percentage" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PsychometricAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PsychometricAttemptSection" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "lockedAt" TIMESTAMP(3),
    "score" INTEGER,
    "maxScore" INTEGER,

    CONSTRAINT "PsychometricAttemptSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PsychometricAttemptQuestion" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "sectionCode" "PsychometricSectionCode",
    "questionOrder" INTEGER NOT NULL,
    "selectedOption" TEXT,
    "likertValue" INTEGER,
    "answeredAt" TIMESTAMP(3),
    "isCorrect" BOOLEAN,
    "pointsAwarded" INTEGER,

    CONSTRAINT "PsychometricAttemptQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PsychometricTest_code_key" ON "PsychometricTest"("code");

-- CreateIndex
CREATE UNIQUE INDEX "PsychometricTest_type_key" ON "PsychometricTest"("type");

-- CreateIndex
CREATE INDEX "PsychometricSection_testId_sortOrder_idx" ON "PsychometricSection"("testId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "PsychometricSection_testId_code_key" ON "PsychometricSection"("testId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "PsychometricQuestion_itemCode_key" ON "PsychometricQuestion"("itemCode");

-- CreateIndex
CREATE INDEX "PsychometricQuestion_testId_idx" ON "PsychometricQuestion"("testId");

-- CreateIndex
CREATE INDEX "PsychometricQuestion_sectionId_idx" ON "PsychometricQuestion"("sectionId");

-- CreateIndex
CREATE INDEX "PsychometricQuestion_domain_idx" ON "PsychometricQuestion"("domain");

-- CreateIndex
CREATE INDEX "PsychometricQuestion_traitKey_idx" ON "PsychometricQuestion"("traitKey");

-- CreateIndex
CREATE INDEX "PsychometricAttempt_userId_testId_idx" ON "PsychometricAttempt"("userId", "testId");

-- CreateIndex
CREATE INDEX "PsychometricAttempt_status_idx" ON "PsychometricAttempt"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PsychometricAttempt_userId_testId_attemptNumber_key" ON "PsychometricAttempt"("userId", "testId", "attemptNumber");

-- CreateIndex
CREATE UNIQUE INDEX "PsychometricAttemptSection_attemptId_sectionId_key" ON "PsychometricAttemptSection"("attemptId", "sectionId");

-- CreateIndex
CREATE INDEX "PsychometricAttemptQuestion_attemptId_questionOrder_idx" ON "PsychometricAttemptQuestion"("attemptId", "questionOrder");

-- CreateIndex
CREATE UNIQUE INDEX "PsychometricAttemptQuestion_attemptId_questionId_key" ON "PsychometricAttemptQuestion"("attemptId", "questionId");

-- AddForeignKey
ALTER TABLE "PsychometricSection" ADD CONSTRAINT "PsychometricSection_testId_fkey" FOREIGN KEY ("testId") REFERENCES "PsychometricTest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PsychometricQuestion" ADD CONSTRAINT "PsychometricQuestion_testId_fkey" FOREIGN KEY ("testId") REFERENCES "PsychometricTest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PsychometricQuestion" ADD CONSTRAINT "PsychometricQuestion_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "PsychometricSection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PsychometricAttempt" ADD CONSTRAINT "PsychometricAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PsychometricAttempt" ADD CONSTRAINT "PsychometricAttempt_testId_fkey" FOREIGN KEY ("testId") REFERENCES "PsychometricTest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PsychometricAttemptSection" ADD CONSTRAINT "PsychometricAttemptSection_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "PsychometricAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PsychometricAttemptSection" ADD CONSTRAINT "PsychometricAttemptSection_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "PsychometricSection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PsychometricAttemptQuestion" ADD CONSTRAINT "PsychometricAttemptQuestion_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "PsychometricAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PsychometricAttemptQuestion" ADD CONSTRAINT "PsychometricAttemptQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "PsychometricQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
