-- CreateTable
CREATE TABLE "spending_insights" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "categoryId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "isDismissed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "spending_insights_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "spending_insights_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "spending_alerts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "categoryId" TEXT,
    "threshold" REAL NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "spending_alerts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "spending_alerts_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "spending_stats" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "categoryId" TEXT,
    "period" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "amount" REAL NOT NULL,
    "count" INTEGER NOT NULL,
    "avgAmount" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "spending_stats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "spending_stats_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "spending_insights_userId_idx" ON "spending_insights"("userId");

-- CreateIndex
CREATE INDEX "spending_insights_categoryId_idx" ON "spending_insights"("categoryId");

-- CreateIndex
CREATE INDEX "spending_insights_isRead_idx" ON "spending_insights"("isRead");

-- CreateIndex
CREATE INDEX "spending_insights_isDismissed_idx" ON "spending_insights"("isDismissed");

-- CreateIndex
CREATE INDEX "spending_alerts_userId_idx" ON "spending_alerts"("userId");

-- CreateIndex
CREATE INDEX "spending_alerts_categoryId_idx" ON "spending_alerts"("categoryId");

-- CreateIndex
CREATE INDEX "spending_alerts_isActive_idx" ON "spending_alerts"("isActive");

-- CreateIndex
CREATE INDEX "spending_stats_userId_idx" ON "spending_stats"("userId");

-- CreateIndex
CREATE INDEX "spending_stats_categoryId_idx" ON "spending_stats"("categoryId");

-- CreateIndex
CREATE INDEX "spending_stats_date_idx" ON "spending_stats"("date");

-- CreateIndex
CREATE UNIQUE INDEX "spending_stats_userId_categoryId_period_date_key" ON "spending_stats"("userId", "categoryId", "period", "date");
