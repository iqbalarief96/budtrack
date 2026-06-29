-- Add import metadata and link imported rows to created transactions
CREATE TABLE "ImportRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'bank_csv',
    "fileName" TEXT,
    "rowHash" TEXT NOT NULL,
    "rawRow" TEXT NOT NULL,
    "parsedDate" DATETIME NOT NULL,
    "parsedAmount" REAL NOT NULL,
    "parsedType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'IMPORTED',
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ImportRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ImportRecord_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ImportRecord_userId_walletId_rowHash_key" ON "ImportRecord"("userId", "walletId", "rowHash");
CREATE INDEX "ImportRecord_userId_createdAt_idx" ON "ImportRecord"("userId", "createdAt");
CREATE INDEX "ImportRecord_walletId_idx" ON "ImportRecord"("walletId");

ALTER TABLE "Transaction" ADD COLUMN "importRecordId" TEXT;
CREATE INDEX "Transaction_importRecordId_idx" ON "Transaction"("importRecordId");
