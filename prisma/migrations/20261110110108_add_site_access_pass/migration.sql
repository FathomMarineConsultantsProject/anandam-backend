-- CreateTable
CREATE TABLE "SiteAccessPass" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokensSpent" INTEGER NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteAccessPass_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SiteAccessPass_userId_key" ON "SiteAccessPass"("userId");

-- CreateIndex
CREATE INDEX "SiteAccessPass_endsAt_idx" ON "SiteAccessPass"("endsAt");

-- AddForeignKey
ALTER TABLE "SiteAccessPass" ADD CONSTRAINT "SiteAccessPass_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
