-- CreateTable
CREATE TABLE "WellbeingQuestionnaire" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'WELLBEING',
    "refillIntervalDays" INTEGER NOT NULL DEFAULT 15,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WellbeingQuestionnaire_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WellbeingQuestionnaireVersion" (
    "id" TEXT NOT NULL,
    "questionnaireId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WellbeingQuestionnaireVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WellbeingQuestion" (
    "id" TEXT NOT NULL,
    "questionnaireVersionId" TEXT NOT NULL,
    "questionKey" TEXT NOT NULL,
    "questionText" TEXT NOT NULL,
    "helperText" TEXT,
    "questionType" TEXT NOT NULL DEFAULT 'SINGLE_CHOICE',
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WellbeingQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WellbeingQuestionOption" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WellbeingQuestionOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WellbeingSubmission" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questionnaireId" TEXT NOT NULL,
    "questionnaireVersionId" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nextEligibleAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WellbeingSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WellbeingAnswer" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "numericValue" DOUBLE PRECISION,
    "textValue" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WellbeingAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WellbeingAnswerOption" (
    "id" TEXT NOT NULL,
    "answerId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,

    CONSTRAINT "WellbeingAnswerOption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WellbeingQuestionnaire_slug_key" ON "WellbeingQuestionnaire"("slug");

-- CreateIndex
CREATE INDEX "WellbeingQuestionnaire_category_isActive_idx" ON "WellbeingQuestionnaire"("category", "isActive");

-- CreateIndex
CREATE INDEX "WellbeingQuestionnaireVersion_questionnaireId_status_idx" ON "WellbeingQuestionnaireVersion"("questionnaireId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "WellbeingQuestionnaireVersion_questionnaireId_version_key" ON "WellbeingQuestionnaireVersion"("questionnaireId", "version");

-- CreateIndex
CREATE INDEX "WellbeingQuestion_questionnaireVersionId_sortOrder_idx" ON "WellbeingQuestion"("questionnaireVersionId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "WellbeingQuestion_questionnaireVersionId_questionKey_key" ON "WellbeingQuestion"("questionnaireVersionId", "questionKey");

-- CreateIndex
CREATE INDEX "WellbeingQuestionOption_questionId_sortOrder_idx" ON "WellbeingQuestionOption"("questionId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "WellbeingQuestionOption_questionId_value_key" ON "WellbeingQuestionOption"("questionId", "value");

-- CreateIndex
CREATE INDEX "WellbeingSubmission_userId_questionnaireId_submittedAt_idx" ON "WellbeingSubmission"("userId", "questionnaireId", "submittedAt");

-- CreateIndex
CREATE INDEX "WellbeingSubmission_userId_nextEligibleAt_idx" ON "WellbeingSubmission"("userId", "nextEligibleAt");

-- CreateIndex
CREATE INDEX "WellbeingAnswer_questionId_idx" ON "WellbeingAnswer"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "WellbeingAnswer_submissionId_questionId_key" ON "WellbeingAnswer"("submissionId", "questionId");

-- CreateIndex
CREATE INDEX "WellbeingAnswerOption_optionId_idx" ON "WellbeingAnswerOption"("optionId");

-- CreateIndex
CREATE UNIQUE INDEX "WellbeingAnswerOption_answerId_optionId_key" ON "WellbeingAnswerOption"("answerId", "optionId");

-- AddForeignKey
ALTER TABLE "WellbeingQuestionnaireVersion" ADD CONSTRAINT "WellbeingQuestionnaireVersion_questionnaireId_fkey" FOREIGN KEY ("questionnaireId") REFERENCES "WellbeingQuestionnaire"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WellbeingQuestion" ADD CONSTRAINT "WellbeingQuestion_questionnaireVersionId_fkey" FOREIGN KEY ("questionnaireVersionId") REFERENCES "WellbeingQuestionnaireVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WellbeingQuestionOption" ADD CONSTRAINT "WellbeingQuestionOption_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "WellbeingQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WellbeingSubmission" ADD CONSTRAINT "WellbeingSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WellbeingSubmission" ADD CONSTRAINT "WellbeingSubmission_questionnaireId_fkey" FOREIGN KEY ("questionnaireId") REFERENCES "WellbeingQuestionnaire"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WellbeingSubmission" ADD CONSTRAINT "WellbeingSubmission_questionnaireVersionId_fkey" FOREIGN KEY ("questionnaireVersionId") REFERENCES "WellbeingQuestionnaireVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WellbeingAnswer" ADD CONSTRAINT "WellbeingAnswer_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "WellbeingSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WellbeingAnswer" ADD CONSTRAINT "WellbeingAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "WellbeingQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WellbeingAnswerOption" ADD CONSTRAINT "WellbeingAnswerOption_answerId_fkey" FOREIGN KEY ("answerId") REFERENCES "WellbeingAnswer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WellbeingAnswerOption" ADD CONSTRAINT "WellbeingAnswerOption_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "WellbeingQuestionOption"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
