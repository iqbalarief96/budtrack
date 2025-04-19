/*
  Warnings:

  - Added the required column `userId` to the `GoalActivity` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_GoalActivity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "goalId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "transactionId" TEXT,
    CONSTRAINT "GoalActivity_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GoalActivity_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_GoalActivity" ("amount", "createdAt", "date", "description", "goalId", "id") SELECT "amount", "createdAt", "date", "description", "goalId", "id" FROM "GoalActivity";
DROP TABLE "GoalActivity";
ALTER TABLE "new_GoalActivity" RENAME TO "GoalActivity";
CREATE INDEX "GoalActivity_goalId_idx" ON "GoalActivity"("goalId");
CREATE INDEX "GoalActivity_transactionId_idx" ON "GoalActivity"("transactionId");
CREATE INDEX "GoalActivity_userId_idx" ON "GoalActivity"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
