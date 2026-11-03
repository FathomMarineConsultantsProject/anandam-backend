-- CreateTable
CREATE TABLE "PsychometricDisclaimerAcknowledgement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "disclaimerVersion" TEXT NOT NULL DEFAULT '1.0',
    "presentedAt" TIMESTAMP(3),
    "canAcknowledgeAt" TIMESTAMP(3),
    "accepted" BOOLEAN NOT NULL DEFAULT false,
    "acknowledgedAt" TIMESTAMP(3),
    "disclaimerTextSnapshot" TEXT NOT NULL,
    "acknowledgementTextSnapshot" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PsychometricDisclaimerAcknowledgement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PsychometricDisclaimerAcknowledgement_attemptId_key" ON "PsychometricDisclaimerAcknowledgement"("attemptId");

-- CreateIndex
CREATE INDEX "PsychometricDisclaimerAcknowledgement_userId_testId_acknowl_idx" ON "PsychometricDisclaimerAcknowledgement"("userId", "testId", "acknowledgedAt");

-- AddForeignKey
ALTER TABLE "PsychometricDisclaimerAcknowledgement" ADD CONSTRAINT "PsychometricDisclaimerAcknowledgement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PsychometricDisclaimerAcknowledgement" ADD CONSTRAINT "PsychometricDisclaimerAcknowledgement_testId_fkey" FOREIGN KEY ("testId") REFERENCES "PsychometricTest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PsychometricDisclaimerAcknowledgement" ADD CONSTRAINT "PsychometricDisclaimerAcknowledgement_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "PsychometricAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
