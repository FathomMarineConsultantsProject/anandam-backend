-- CreateEnum
CREATE TYPE "JournalEntryStatus" AS ENUM ('DRAFT', 'SAVED');

-- CreateEnum
CREATE TYPE "JournalEntryType" AS ENUM ('TEMPLATE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "JournalCustomBlockType" AS ENUM ('QUESTION', 'NOTE');

-- CreateTable
CREATE TABLE "JournalTemplate" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "imageKey" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JournalTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalTemplateQuestion" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "questionKey" TEXT NOT NULL,
    "questionText" TEXT NOT NULL,
    "helperText" TEXT,
    "sortOrder" INTEGER NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JournalTemplateQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "templateId" TEXT,
    "type" "JournalEntryType" NOT NULL,
    "status" "JournalEntryStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT,
    "content" TEXT,
    "entryDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "templateTitleSnapshot" TEXT,
    "templateDescriptionSnapshot" TEXT,
    "savedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JournalEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalAnswer" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "questionTextSnapshot" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JournalAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalCustomBlock" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "type" "JournalCustomBlockType" NOT NULL,
    "prompt" TEXT,
    "content" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JournalCustomBlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "JournalTemplate_slug_key" ON "JournalTemplate"("slug");

-- CreateIndex
CREATE INDEX "JournalTemplate_isActive_sortOrder_idx" ON "JournalTemplate"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "JournalTemplateQuestion_templateId_isActive_sortOrder_idx" ON "JournalTemplateQuestion"("templateId", "isActive", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "JournalTemplateQuestion_templateId_questionKey_key" ON "JournalTemplateQuestion"("templateId", "questionKey");

-- CreateIndex
CREATE INDEX "JournalEntry_userId_status_entryDate_idx" ON "JournalEntry"("userId", "status", "entryDate");

-- CreateIndex
CREATE INDEX "JournalEntry_userId_updatedAt_idx" ON "JournalEntry"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "JournalEntry_templateId_idx" ON "JournalEntry"("templateId");

-- CreateIndex
CREATE INDEX "JournalAnswer_entryId_idx" ON "JournalAnswer"("entryId");

-- CreateIndex
CREATE INDEX "JournalAnswer_questionId_idx" ON "JournalAnswer"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "JournalAnswer_entryId_questionId_key" ON "JournalAnswer"("entryId", "questionId");

-- CreateIndex
CREATE INDEX "JournalCustomBlock_entryId_sortOrder_idx" ON "JournalCustomBlock"("entryId", "sortOrder");

-- AddForeignKey
ALTER TABLE "JournalTemplateQuestion" ADD CONSTRAINT "JournalTemplateQuestion_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "JournalTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "JournalTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalAnswer" ADD CONSTRAINT "JournalAnswer_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "JournalEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalAnswer" ADD CONSTRAINT "JournalAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "JournalTemplateQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalCustomBlock" ADD CONSTRAINT "JournalCustomBlock_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "JournalEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
