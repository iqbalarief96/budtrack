/*
  Warnings:

  - You are about to drop the column `currency` on the `Wallet` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Wallet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "balance" REAL NOT NULL DEFAULT 0,
    "currencyCode" TEXT NOT NULL DEFAULT 'IDR',
    "icon" TEXT,
    "color" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "Wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Wallet" ("balance", "createdAt", "id", "name", "updatedAt", "userId") SELECT "balance", "createdAt", "id", "name", "updatedAt", "userId" FROM "Wallet";
DROP TABLE "Wallet";
ALTER TABLE "new_Wallet" RENAME TO "Wallet";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
