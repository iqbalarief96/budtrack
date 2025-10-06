/*
  Warnings:

  - You are about to drop the `FinancialAdviceGoal` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Goal` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `GoalActivity` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `GoalCategory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `current` on the `EmergencyFund` table. All the data in the column will be lost.
  - You are about to drop the column `target` on the `EmergencyFund` table. All the data in the column will be lost.
  - You are about to drop the column `goalId` on the `Transaction` table. All the data in the column will be lost.
  - Added the required column `currentAmount` to the `EmergencyFund` table without a default value. This is not possible if the table is not empty.
  - Added the required column `monthlyContribution` to the `EmergencyFund` table without a default value. This is not possible if the table is not empty.
  - Added the required column `targetAmount` to the `EmergencyFund` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "FinancialAdviceGoal_adviceId_goalId_key";

-- DropIndex
DROP INDEX "FinancialAdviceGoal_goalId_idx";

-- DropIndex
DROP INDEX "FinancialAdviceGoal_adviceId_idx";

-- DropIndex
DROP INDEX "GoalActivity_userId_idx";

-- DropIndex
DROP INDEX "GoalActivity_goalId_idx";

-- DropIndex
DROP INDEX "GoalCategory_goalId_categoryId_key";

-- DropIndex
DROP INDEX "GoalCategory_categoryId_idx";

-- DropIndex
DROP INDEX "GoalCategory_goalId_idx";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "FinancialAdviceGoal";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Goal";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "GoalActivity";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "GoalCategory";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "DashboardView" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "timeframe" TEXT,
    "widgets" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DashboardView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_EmergencyFund" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "targetAmount" REAL NOT NULL,
    "currentAmount" REAL NOT NULL,
    "monthlyContribution" REAL NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EmergencyFund_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_EmergencyFund" ("createdAt", "id", "updatedAt", "userId") SELECT "createdAt", "id", "updatedAt", "userId" FROM "EmergencyFund";
DROP TABLE "EmergencyFund";
ALTER TABLE "new_EmergencyFund" RENAME TO "EmergencyFund";
CREATE UNIQUE INDEX "EmergencyFund_userId_key" ON "EmergencyFund"("userId");
CREATE INDEX "EmergencyFund_userId_idx" ON "EmergencyFund"("userId");
CREATE TABLE "new_Transaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "amount" REAL NOT NULL,
    "description" TEXT,
    "date" DATETIME NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "categoryId" TEXT,
    CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Transaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Transaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Transaction" ("amount", "categoryId", "createdAt", "date", "description", "id", "type", "updatedAt", "userId", "walletId") SELECT "amount", "categoryId", "createdAt", "date", "description", "id", "type", "updatedAt", "userId", "walletId" FROM "Transaction";
DROP TABLE "Transaction";
ALTER TABLE "new_Transaction" RENAME TO "Transaction";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "DashboardView_userId_idx" ON "DashboardView"("userId");
