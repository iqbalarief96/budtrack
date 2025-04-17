-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Wedding" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "location" TEXT,
    "budget" REAL NOT NULL DEFAULT 0,
    "spentBudget" REAL NOT NULL DEFAULT 0,
    "expectedGuests" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PLANNING',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Wedding_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Wedding" ("budget", "createdAt", "date", "expectedGuests", "id", "location", "notes", "status", "title", "updatedAt", "userId") SELECT "budget", "createdAt", "date", "expectedGuests", "id", "location", "notes", "status", "title", "updatedAt", "userId" FROM "Wedding";
DROP TABLE "Wedding";
ALTER TABLE "new_Wedding" RENAME TO "Wedding";
CREATE INDEX "Wedding_userId_idx" ON "Wedding"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
