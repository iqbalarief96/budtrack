-- CreateTable
CREATE TABLE "subscription_trackers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "walletId" TEXT,
    "name" TEXT NOT NULL,
    "provider" TEXT,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'other',
    "amount" REAL NOT NULL DEFAULT 0,
    "currencyCode" TEXT NOT NULL DEFAULT 'IDR',
    "billingCycle" TEXT NOT NULL DEFAULT 'monthly',
    "status" TEXT NOT NULL DEFAULT 'active',
    "startDate" DATETIME,
    "trialEndsAt" DATETIME,
    "nextBillingAt" DATETIME,
    "cancelBeforeAt" DATETIME,
    "reminderDaysBefore" INTEGER NOT NULL DEFAULT 3,
    "autoRenew" BOOLEAN NOT NULL DEFAULT true,
    "reminderEnabled" BOOLEAN NOT NULL DEFAULT true,
    "website" TEXT,
    "notes" TEXT,
    "lastReminderSentAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "subscription_trackers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "subscription_trackers_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "subscription_trackers_userId_idx" ON "subscription_trackers"("userId");

-- CreateIndex
CREATE INDEX "subscription_trackers_walletId_idx" ON "subscription_trackers"("walletId");

-- CreateIndex
CREATE INDEX "subscription_trackers_status_idx" ON "subscription_trackers"("status");

-- CreateIndex
CREATE INDEX "subscription_trackers_trialEndsAt_idx" ON "subscription_trackers"("trialEndsAt");

-- CreateIndex
CREATE INDEX "subscription_trackers_nextBillingAt_idx" ON "subscription_trackers"("nextBillingAt");
