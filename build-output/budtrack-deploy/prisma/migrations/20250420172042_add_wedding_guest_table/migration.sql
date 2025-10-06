-- CreateTable
CREATE TABLE "WeddingBudgetCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "weddingId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "total" REAL NOT NULL DEFAULT 0,
    "spent" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WeddingBudgetCategory_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WeddingBudgetItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "budgeted" REAL NOT NULL,
    "actual" REAL NOT NULL DEFAULT 0,
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WeddingBudgetItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "WeddingBudgetCategory" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "WeddingBudgetCategory_weddingId_idx" ON "WeddingBudgetCategory"("weddingId");

-- CreateIndex
CREATE INDEX "WeddingBudgetItem_categoryId_idx" ON "WeddingBudgetItem"("categoryId");
