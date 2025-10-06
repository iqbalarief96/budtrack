/*
  Warnings:

  - Added the required column `walletId` to the `Investment` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Investment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "tickerSymbol" TEXT,
    "quantity" REAL NOT NULL,
    "averagePurchasePrice" REAL NOT NULL,
    "purchaseDate" DATETIME NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    CONSTRAINT "Investment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Investment_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Investment" ("averagePurchasePrice", "createdAt", "id", "name", "notes", "purchaseDate", "quantity", "tickerSymbol", "type", "updatedAt", "userId") SELECT "averagePurchasePrice", "createdAt", "id", "name", "notes", "purchaseDate", "quantity", "tickerSymbol", "type", "updatedAt", "userId" FROM "Investment";
DROP TABLE "Investment";
ALTER TABLE "new_Investment" RENAME TO "Investment";
CREATE INDEX "Investment_userId_idx" ON "Investment"("userId");
CREATE INDEX "Investment_walletId_idx" ON "Investment"("walletId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
