-- CreateTable
CREATE TABLE "SalaryAllocationConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "monthlyIncome" REAL NOT NULL,
    "templateType" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SalaryAllocationConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AllocationItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "configId" TEXT NOT NULL,
    "categoryName" TEXT NOT NULL,
    "categoryType" TEXT NOT NULL,
    "percentage" REAL NOT NULL,
    "amount" REAL NOT NULL,
    "mappedCategoryId" TEXT,
    "icon" TEXT,
    "color" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AllocationItem_configId_fkey" FOREIGN KEY ("configId") REFERENCES "SalaryAllocationConfig" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AllocationItem_mappedCategoryId_fkey" FOREIGN KEY ("mappedCategoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "SalaryAllocationConfig_userId_idx" ON "SalaryAllocationConfig"("userId");

-- CreateIndex
CREATE INDEX "AllocationItem_configId_idx" ON "AllocationItem"("configId");

-- CreateIndex
CREATE INDEX "AllocationItem_mappedCategoryId_idx" ON "AllocationItem"("mappedCategoryId");
