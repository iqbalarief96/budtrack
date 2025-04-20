-- CreateTable
CREATE TABLE "RecurringTransactionHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recurringTransactionId" TEXT NOT NULL,
    "transactionId" TEXT,
    "processedDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "targetDate" DATETIME NOT NULL,
    "amount" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CREATED',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RecurringTransactionHistory_recurringTransactionId_fkey" FOREIGN KEY ("recurringTransactionId") REFERENCES "RecurringTransaction" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RecurringTransactionHistory_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "RecurringTransactionHistory_recurringTransactionId_idx" ON "RecurringTransactionHistory"("recurringTransactionId");

-- CreateIndex
CREATE INDEX "RecurringTransactionHistory_transactionId_idx" ON "RecurringTransactionHistory"("transactionId");
