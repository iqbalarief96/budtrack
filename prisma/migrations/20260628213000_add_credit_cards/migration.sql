-- CreateTable
CREATE TABLE "credit_cards" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "walletId" TEXT,
    "name" TEXT NOT NULL,
    "issuer" TEXT,
    "lastFour" TEXT,
    "creditLimit" REAL NOT NULL DEFAULT 0,
    "currentBalance" REAL NOT NULL DEFAULT 0,
    "statementDay" INTEGER NOT NULL,
    "dueDay" INTEGER NOT NULL,
    "apr" REAL,
    "minimumPaymentRate" REAL NOT NULL DEFAULT 0.03,
    "reminderDaysBefore" INTEGER NOT NULL DEFAULT 7,
    "status" TEXT NOT NULL DEFAULT 'active',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "credit_cards_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "credit_cards_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "credit_card_transactions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'charge',
    "description" TEXT,
    "merchant" TEXT,
    "category" TEXT,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "statementId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "credit_card_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "credit_card_transactions_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "credit_cards" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "credit_cards_userId_idx" ON "credit_cards"("userId");
CREATE INDEX "credit_cards_walletId_idx" ON "credit_cards"("walletId");
CREATE INDEX "credit_cards_status_idx" ON "credit_cards"("status");
CREATE INDEX "credit_card_transactions_userId_idx" ON "credit_card_transactions"("userId");
CREATE INDEX "credit_card_transactions_cardId_idx" ON "credit_card_transactions"("cardId");
CREATE INDEX "credit_card_transactions_date_idx" ON "credit_card_transactions"("date");
CREATE INDEX "credit_card_transactions_type_idx" ON "credit_card_transactions"("type");
