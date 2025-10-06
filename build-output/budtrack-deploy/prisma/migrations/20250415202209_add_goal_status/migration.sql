-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Goal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "target" REAL NOT NULL,
    "current" REAL NOT NULL DEFAULT 0,
    "deadline" DATETIME,
    "category" TEXT,
    "description" TEXT,
    "icon" TEXT,
    "color" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ONGOING',
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Goal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Goal" ("category", "color", "createdAt", "current", "deadline", "description", "icon", "id", "isArchived", "name", "target", "updatedAt", "userId") SELECT "category", "color", "createdAt", "current", "deadline", "description", "icon", "id", "isArchived", "name", "target", "updatedAt", "userId" FROM "Goal";
DROP TABLE "Goal";
ALTER TABLE "new_Goal" RENAME TO "Goal";
CREATE INDEX "Goal_userId_idx" ON "Goal"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
