-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_RecurringTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "category" TEXT,
    "frequency" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "nextPaymentDate" DATETIME NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "type" TEXT NOT NULL DEFAULT 'expense',
    "recurringType" TEXT NOT NULL DEFAULT 'regular',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "walletId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "RecurringTransaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RecurringTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_RecurringTransaction" ("amount", "category", "createdAt", "description", "frequency", "id", "isActive", "name", "nextPaymentDate", "startDate", "type", "updatedAt", "userId", "walletId") SELECT "amount", "category", "createdAt", "description", "frequency", "id", "isActive", "name", "nextPaymentDate", "startDate", "type", "updatedAt", "userId", "walletId" FROM "RecurringTransaction";
DROP TABLE "RecurringTransaction";
ALTER TABLE "new_RecurringTransaction" RENAME TO "RecurringTransaction";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
