/*
  Warnings:

  - You are about to alter the column `tokensSpent` on the `SiteAccessPass` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `Decimal(14,6)`.
  - You are about to alter the column `amount` on the `TokenTransaction` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `Decimal(14,6)`.
  - You are about to alter the column `balanceBefore` on the `TokenTransaction` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `Decimal(14,6)`.
  - You are about to alter the column `balanceAfter` on the `TokenTransaction` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `Decimal(14,6)`.
  - You are about to alter the column `balance` on the `TokenWallet` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `Decimal(14,6)`.

*/
-- AlterTable
ALTER TABLE "SiteAccessPass" ALTER COLUMN "tokensSpent" SET DATA TYPE DECIMAL(14,6);

-- AlterTable
ALTER TABLE "TokenTransaction" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(14,6),
ALTER COLUMN "balanceBefore" SET DATA TYPE DECIMAL(14,6),
ALTER COLUMN "balanceAfter" SET DATA TYPE DECIMAL(14,6);

-- AlterTable
ALTER TABLE "TokenWallet" ALTER COLUMN "balance" SET DEFAULT 0,
ALTER COLUMN "balance" SET DATA TYPE DECIMAL(14,6);
