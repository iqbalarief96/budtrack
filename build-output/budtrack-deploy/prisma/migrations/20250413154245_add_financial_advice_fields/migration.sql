/*
  Warnings:

  - Added the required column `updatedAt` to the `FinancialAdvice` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_FinancialAdvice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "detailedAnalysis" TEXT,
    "actionSteps" TEXT,
    "resources" TEXT,
    "type" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "estimatedImpact" REAL,
    "walletId" TEXT,
    "timeframe" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    CONSTRAINT "FinancialAdvice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_FinancialAdvice" ("createdAt", "description", "estimatedImpact", "id", "priority", "timeframe", "title", "type", "userId", "walletId", "updatedAt", "actionSteps", "resources")
SELECT
    "createdAt",
    "description",
    "estimatedImpact",
    "id",
    "priority",
    "timeframe",
    "title",
    "type",
    "userId",
    "walletId",
    "createdAt" AS "updatedAt",
    '[]' AS "actionSteps",
    NULL AS "resources"
FROM "FinancialAdvice";
DROP TABLE "FinancialAdvice";
ALTER TABLE "new_FinancialAdvice" RENAME TO "FinancialAdvice";
CREATE INDEX "FinancialAdvice_userId_idx" ON "FinancialAdvice"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
