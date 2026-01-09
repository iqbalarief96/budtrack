-- CreateTable
CREATE TABLE "wallet_groups" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "color" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "wallet_groups_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "wallet_group_members" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "walletGroupId" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "addedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "wallet_group_members_walletGroupId_fkey" FOREIGN KEY ("walletGroupId") REFERENCES "wallet_groups" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "wallet_group_members_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "wallet_groups_userId_idx" ON "wallet_groups"("userId");

-- CreateIndex
CREATE INDEX "wallet_group_members_walletGroupId_idx" ON "wallet_group_members"("walletGroupId");

-- CreateIndex
CREATE INDEX "wallet_group_members_walletId_idx" ON "wallet_group_members"("walletId");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_group_members_walletGroupId_walletId_key" ON "wallet_group_members"("walletGroupId", "walletId");
