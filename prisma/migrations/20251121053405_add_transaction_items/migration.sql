-- AlterTable
ALTER TABLE "UserSettings" ADD COLUMN "geminiApiKey" TEXT;
ALTER TABLE "UserSettings" ADD COLUMN "openaiApiKey" TEXT;

-- CreateTable
CREATE TABLE "TransactionItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "transactionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" REAL NOT NULL DEFAULT 1,
    "unitPrice" REAL NOT NULL,
    "totalPrice" REAL NOT NULL,
    "category" TEXT,
    "notes" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TransactionItem_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "TransactionItem_transactionId_idx" ON "TransactionItem"("transactionId");

-- CreateIndex
CREATE INDEX "TransactionItem_name_idx" ON "TransactionItem"("name");
