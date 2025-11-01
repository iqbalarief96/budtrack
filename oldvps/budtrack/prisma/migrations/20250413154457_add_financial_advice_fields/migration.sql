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
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "FinancialAdvice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_FinancialAdvice" ("actionSteps", "createdAt", "description", "detailedAnalysis", "estimatedImpact", "id", "priority", "resources", "timeframe", "title", "type", "updatedAt", "userId", "walletId") SELECT "actionSteps", "createdAt", "description", "detailedAnalysis", "estimatedImpact", "id", "priority", "resources", "timeframe", "title", "type", "updatedAt", "userId", "walletId" FROM "FinancialAdvice";
DROP TABLE "FinancialAdvice";
ALTER TABLE "new_FinancialAdvice" RENAME TO "FinancialAdvice";
CREATE INDEX "FinancialAdvice_userId_idx" ON "FinancialAdvice"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
