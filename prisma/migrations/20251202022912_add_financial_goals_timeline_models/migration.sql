-- CreateTable
CREATE TABLE "goal_projections" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "goalId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectedDate" DATETIME NOT NULL,
    "confidenceLevel" TEXT NOT NULL,
    "requiredSavingRate" REAL NOT NULL,
    "currentProgress" REAL NOT NULL,
    "assumptions" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "goal_projections_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "goal_projections_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "goal_priorities" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "priority" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "goal_priorities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "goal_priorities_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "timeline_scenarios" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "assumptions" TEXT NOT NULL,
    "projections" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "timeline_scenarios_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "saving_rate_history" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "month" DATETIME NOT NULL,
    "income" REAL NOT NULL,
    "expenses" REAL NOT NULL,
    "savings" REAL NOT NULL,
    "savingRate" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "saving_rate_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "goal_projections_goalId_idx" ON "goal_projections"("goalId");

-- CreateIndex
CREATE INDEX "goal_projections_userId_idx" ON "goal_projections"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "goal_priorities_goalId_key" ON "goal_priorities"("goalId");

-- CreateIndex
CREATE INDEX "goal_priorities_userId_idx" ON "goal_priorities"("userId");

-- CreateIndex
CREATE INDEX "goal_priorities_goalId_idx" ON "goal_priorities"("goalId");

-- CreateIndex
CREATE UNIQUE INDEX "goal_priorities_userId_goalId_key" ON "goal_priorities"("userId", "goalId");

-- CreateIndex
CREATE INDEX "timeline_scenarios_userId_idx" ON "timeline_scenarios"("userId");

-- CreateIndex
CREATE INDEX "saving_rate_history_userId_idx" ON "saving_rate_history"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "saving_rate_history_userId_month_key" ON "saving_rate_history"("userId", "month");
