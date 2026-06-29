-- CreateTable
CREATE TABLE "shared_bills" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "walletId" TEXT,
    "walletGroupId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'household',
    "totalAmount" REAL NOT NULL DEFAULT 0,
    "currencyCode" TEXT NOT NULL DEFAULT 'IDR',
    "dueDate" DATETIME,
    "paidAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'open',
    "splitMethod" TEXT NOT NULL DEFAULT 'equal',
    "recurrence" TEXT NOT NULL DEFAULT 'none',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "shared_bills_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "shared_bills_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "shared_bills_walletGroupId_fkey" FOREIGN KEY ("walletGroupId") REFERENCES "wallet_groups" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "shared_bill_participants" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sharedBillId" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "shareAmount" REAL NOT NULL DEFAULT 0,
    "sharePercent" REAL,
    "paidAmount" REAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'unpaid',
    "paidAt" DATETIME,
    "settlementNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "shared_bill_participants_sharedBillId_fkey" FOREIGN KEY ("sharedBillId") REFERENCES "shared_bills" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "shared_bill_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "shared_bills_userId_idx" ON "shared_bills"("userId");
CREATE INDEX "shared_bills_walletId_idx" ON "shared_bills"("walletId");
CREATE INDEX "shared_bills_walletGroupId_idx" ON "shared_bills"("walletGroupId");
CREATE INDEX "shared_bills_status_idx" ON "shared_bills"("status");
CREATE INDEX "shared_bills_dueDate_idx" ON "shared_bills"("dueDate");
CREATE INDEX "shared_bill_participants_sharedBillId_idx" ON "shared_bill_participants"("sharedBillId");
CREATE INDEX "shared_bill_participants_userId_idx" ON "shared_bill_participants"("userId");
CREATE INDEX "shared_bill_participants_status_idx" ON "shared_bill_participants"("status");
