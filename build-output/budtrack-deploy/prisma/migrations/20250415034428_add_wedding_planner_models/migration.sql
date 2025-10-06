/*
  Warnings:

  - You are about to drop the `Gift` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Inspiration` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PlaylistSong` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RundownEvent` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `mandatory` on the `Document` table. All the data in the column will be lost.
  - You are about to drop the column `audienceType` on the `Souvenir` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `Vendor` table. All the data in the column will be lost.
  - You are about to alter the column `rating` on the `Vendor` table. The data in that column could be lost. The data in that column will be cast from `Float` to `Int`.
  - You are about to drop the column `city` on the `Venue` table. All the data in the column will be lost.
  - You are about to drop the column `contactEmail` on the `Venue` table. All the data in the column will be lost.
  - You are about to drop the column `contactName` on the `Venue` table. All the data in the column will be lost.
  - You are about to drop the column `contactPhone` on the `Venue` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `Venue` table. All the data in the column will be lost.
  - You are about to drop the column `features` on the `Venue` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Venue` table. All the data in the column will be lost.
  - You are about to drop the column `confirmedGuests` on the `Wedding` table. All the data in the column will be lost.
  - You are about to drop the column `guests` on the `Wedding` table. All the data in the column will be lost.
  - You are about to drop the column `spentBudget` on the `Wedding` table. All the data in the column will be lost.
  - Made the column `pricePerUnit` on table `Souvenir` required. This step will fail if there are existing NULL values in that column.
  - Made the column `totalBudget` on table `Souvenir` required. This step will fail if there are existing NULL values in that column.
  - Made the column `type` on table `Souvenir` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `title` to the `Wedding` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `Wedding` table without a default value. This is not possible if the table is not empty.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Gift";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Inspiration";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "PlaylistSong";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "RundownEvent";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "Investment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "tickerSymbol" TEXT,
    "quantity" REAL NOT NULL,
    "averagePurchasePrice" REAL NOT NULL,
    "purchaseDate" DATETIME NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    CONSTRAINT "Investment_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Investment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" DATETIME,
    "image" TEXT,
    "password" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "riskProfile" TEXT
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" DATETIME NOT NULL,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Wallet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "balance" REAL NOT NULL DEFAULT 0,
    "currencyCode" TEXT NOT NULL DEFAULT 'IDR',
    "icon" TEXT,
    "color" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "Wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "icon" TEXT,
    "color" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    "parentId" TEXT,
    CONSTRAINT "Category_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "amount" REAL NOT NULL,
    "description" TEXT,
    "date" DATETIME NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "categoryId" TEXT,
    CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Transaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Transaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Budget" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "amount" REAL NOT NULL,
    "spent" REAL NOT NULL DEFAULT 0,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    CONSTRAINT "Budget_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Budget_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Budget_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EmergencyFund" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "targetAmount" REAL NOT NULL,
    "currentAmount" REAL NOT NULL,
    "monthlyContribution" REAL NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EmergencyFund_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "language" TEXT NOT NULL DEFAULT 'id',
    "theme" TEXT NOT NULL DEFAULT 'light',
    "provider" TEXT,
    "apiKey" TEXT,
    "selectedModel" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FinancialAdvice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "estimatedImpact" REAL,
    "walletId" TEXT,
    "timeframe" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    CONSTRAINT "FinancialAdvice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CategoryRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "pattern" TEXT NOT NULL,
    "isRegex" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "userId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CategoryRule_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CategoryRule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RecurringTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "category" TEXT,
    "frequency" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "nextPaymentDate" DATETIME NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "type" TEXT NOT NULL DEFAULT 'expense',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "walletId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "RecurringTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RecurringTransaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Group" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "color" TEXT DEFAULT '#6366f1',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "ownerId" TEXT NOT NULL,
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Group_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserGroup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "permissions" TEXT,
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserGroup_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserGroup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserGroupSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "notificationMethod" TEXT NOT NULL DEFAULT 'email',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserGroupSettings_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserGroupSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GroupWallet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "groupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "balance" REAL NOT NULL DEFAULT 0,
    "currencyCode" TEXT NOT NULL DEFAULT 'IDR',
    "icon" TEXT,
    "color" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GroupWallet_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GroupTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "groupWalletId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "type" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "description" TEXT,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "categoryId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GroupTransaction_groupWalletId_fkey" FOREIGN KEY ("groupWalletId") REFERENCES "GroupWallet" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "GroupTransaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "GroupTransaction_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExpenseSplit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "groupTransactionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "paidDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ExpenseSplit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ExpenseSplit_groupTransactionId_fkey" FOREIGN KEY ("groupTransactionId") REFERENCES "GroupTransaction" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GroupBudget" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "groupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "spent" REAL NOT NULL DEFAULT 0,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "categoryId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GroupBudget_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "GroupBudget_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GroupInvite" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "groupId" TEXT NOT NULL,
    "email" TEXT,
    "code" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "usedAt" DATETIME,
    "usedById" TEXT,
    CONSTRAINT "GroupInvite_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "userMessage" TEXT NOT NULL,
    "assistantMessage" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChatMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "additionalData" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Alert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DashboardView" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "timeframe" TEXT,
    "widgets" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DashboardView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Rundown" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "weddingId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "responsible" TEXT,
    "category" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Rundown_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Playlist" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "weddingId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "artist" TEXT NOT NULL,
    "duration" TEXT,
    "category" TEXT,
    "url" TEXT,
    "notes" TEXT,
    "order" INTEGER,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Playlist_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Moodboard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "weddingId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT NOT NULL,
    "category" TEXT,
    "isInspiration" BOOLEAN NOT NULL DEFAULT true,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Moodboard_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Document" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "weddingId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "deadline" DATETIME,
    "location" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "isMandatory" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "attachmentUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Document_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Document" ("createdAt", "deadline", "description", "id", "location", "name", "notes", "status", "updatedAt", "weddingId") SELECT "createdAt", "deadline", "description", "id", "location", "name", "notes", "status", "updatedAt", "weddingId" FROM "Document";
DROP TABLE "Document";
ALTER TABLE "new_Document" RENAME TO "Document";
CREATE INDEX "Document_weddingId_idx" ON "Document"("weddingId");
CREATE TABLE "new_Souvenir" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "weddingId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "pricePerUnit" REAL NOT NULL,
    "totalBudget" REAL NOT NULL,
    "vendor" TEXT,
    "description" TEXT,
    "imageUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PLANNING',
    "orderDate" DATETIME,
    "deliveryDate" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Souvenir_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Souvenir" ("createdAt", "id", "imageUrl", "name", "notes", "pricePerUnit", "quantity", "status", "totalBudget", "type", "updatedAt", "vendor", "weddingId") SELECT "createdAt", "id", "imageUrl", "name", "notes", "pricePerUnit", "quantity", "status", "totalBudget", "type", "updatedAt", "vendor", "weddingId" FROM "Souvenir";
DROP TABLE "Souvenir";
ALTER TABLE "new_Souvenir" RENAME TO "Souvenir";
CREATE INDEX "Souvenir_weddingId_idx" ON "Souvenir"("weddingId");
CREATE TABLE "new_Vendor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "weddingId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "contactPerson" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "address" TEXT,
    "priceRange" TEXT,
    "status" TEXT NOT NULL DEFAULT 'CONSIDERING',
    "rating" INTEGER,
    "imageUrl" TEXT,
    "instagramHandle" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Vendor_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Vendor" ("address", "category", "contactPerson", "createdAt", "email", "id", "imageUrl", "instagramHandle", "name", "notes", "phone", "priceRange", "rating", "status", "updatedAt", "website", "weddingId") SELECT "address", "category", "contactPerson", "createdAt", "email", "id", "imageUrl", "instagramHandle", "name", "notes", "phone", "priceRange", "rating", "status", "updatedAt", "website", "weddingId" FROM "Vendor";
DROP TABLE "Vendor";
ALTER TABLE "new_Vendor" RENAME TO "Vendor";
CREATE INDEX "Vendor_weddingId_idx" ON "Vendor"("weddingId");
CREATE TABLE "new_Venue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "weddingId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "capacity" INTEGER,
    "priceRange" TEXT,
    "contactPerson" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "notes" TEXT,
    "isBooked" BOOLEAN NOT NULL DEFAULT false,
    "bookingDate" DATETIME,
    "depositAmount" REAL,
    "imageUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Venue_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Venue" ("address", "capacity", "createdAt", "id", "imageUrl", "name", "notes", "priceRange", "updatedAt", "weddingId") SELECT "address", "capacity", "createdAt", "id", "imageUrl", "name", "notes", "priceRange", "updatedAt", "weddingId" FROM "Venue";
DROP TABLE "Venue";
ALTER TABLE "new_Venue" RENAME TO "Venue";
CREATE INDEX "Venue_weddingId_idx" ON "Venue"("weddingId");
CREATE TABLE "new_Wedding" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "location" TEXT,
    "budget" REAL NOT NULL DEFAULT 0,
    "expectedGuests" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PLANNING',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Wedding_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Wedding" ("budget", "createdAt", "date", "id", "updatedAt") SELECT "budget", "createdAt", "date", "id", "updatedAt" FROM "Wedding";
DROP TABLE "Wedding";
ALTER TABLE "new_Wedding" RENAME TO "Wedding";
CREATE INDEX "Wedding_userId_idx" ON "Wedding"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Investment_userId_idx" ON "Investment"("userId");

-- CreateIndex
CREATE INDEX "Investment_walletId_idx" ON "Investment"("walletId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_userId_key" ON "Category"("name", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "EmergencyFund_userId_key" ON "EmergencyFund"("userId");

-- CreateIndex
CREATE INDEX "EmergencyFund_userId_idx" ON "EmergencyFund"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserSettings_userId_key" ON "UserSettings"("userId");

-- CreateIndex
CREATE INDEX "FinancialAdvice_userId_idx" ON "FinancialAdvice"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserGroup_userId_groupId_key" ON "UserGroup"("userId", "groupId");

-- CreateIndex
CREATE UNIQUE INDEX "UserGroupSettings_userId_groupId_key" ON "UserGroupSettings"("userId", "groupId");

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseSplit_groupTransactionId_userId_key" ON "ExpenseSplit"("groupTransactionId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "GroupInvite_code_key" ON "GroupInvite"("code");

-- CreateIndex
CREATE INDEX "DashboardView_userId_idx" ON "DashboardView"("userId");

-- CreateIndex
CREATE INDEX "Rundown_weddingId_idx" ON "Rundown"("weddingId");

-- CreateIndex
CREATE INDEX "Playlist_weddingId_idx" ON "Playlist"("weddingId");

-- CreateIndex
CREATE INDEX "Moodboard_weddingId_idx" ON "Moodboard"("weddingId");
