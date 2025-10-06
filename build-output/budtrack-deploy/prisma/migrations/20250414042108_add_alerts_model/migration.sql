/*
  Warnings:

  - You are about to drop the column `actionSteps` on the `FinancialAdvice` table. All the data in the column will be lost.
  - You are about to drop the column `detailedAnalysis` on the `FinancialAdvice` table. All the data in the column will be lost.
  - You are about to drop the column `resources` on the `FinancialAdvice` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `FinancialAdvice` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "userMessage" TEXT NOT NULL,
    "assistantMessage" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChatMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "additionalData" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Alert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_FinancialAdvice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "estimatedImpact" REAL,
    "walletId" TEXT,
    "timeframe" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    CONSTRAINT "FinancialAdvice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_FinancialAdvice" ("createdAt", "description", "estimatedImpact", "id", "priority", "timeframe", "title", "type", "userId", "walletId") SELECT "createdAt", "description", "estimatedImpact", "id", "priority", "timeframe", "title", "type", "userId", "walletId" FROM "FinancialAdvice";
DROP TABLE "FinancialAdvice";
ALTER TABLE "new_FinancialAdvice" RENAME TO "FinancialAdvice";
CREATE INDEX "FinancialAdvice_userId_idx" ON "FinancialAdvice"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
