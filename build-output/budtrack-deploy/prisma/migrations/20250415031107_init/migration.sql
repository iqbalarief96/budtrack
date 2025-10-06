/*
  Warnings:

  - You are about to drop the `Account` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Alert` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Budget` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Category` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CategoryRule` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ChatMessage` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DashboardView` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `EmergencyFund` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ExpenseSplit` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `FinancialAdvice` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Group` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `GroupBudget` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `GroupInvite` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `GroupTransaction` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `GroupWallet` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Investment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RecurringTransaction` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Session` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Transaction` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UserGroup` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UserGroupSettings` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UserSettings` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `VerificationToken` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Wallet` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Account";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Alert";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Budget";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Category";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "CategoryRule";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ChatMessage";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "DashboardView";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "EmergencyFund";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ExpenseSplit";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "FinancialAdvice";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Group";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "GroupBudget";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "GroupInvite";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "GroupTransaction";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "GroupWallet";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Investment";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "RecurringTransaction";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Session";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Transaction";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "User";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "UserGroup";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "UserGroupSettings";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "UserSettings";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "VerificationToken";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Wallet";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "Wedding" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "budget" REAL NOT NULL,
    "spentBudget" REAL NOT NULL DEFAULT 0,
    "guests" INTEGER NOT NULL,
    "confirmedGuests" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Venue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "address" TEXT NOT NULL,
    "city" TEXT,
    "capacity" INTEGER,
    "priceRange" TEXT,
    "contactName" TEXT,
    "contactPhone" TEXT,
    "contactEmail" TEXT,
    "features" TEXT,
    "imageUrl" TEXT,
    "status" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "weddingId" TEXT NOT NULL,
    CONSTRAINT "Venue_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Vendor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "contactPerson" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "address" TEXT,
    "priceRange" TEXT,
    "instagramHandle" TEXT,
    "imageUrl" TEXT,
    "rating" REAL,
    "status" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "weddingId" TEXT NOT NULL,
    CONSTRAINT "Vendor_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "deadline" DATETIME,
    "location" TEXT,
    "mandatory" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "weddingId" TEXT NOT NULL,
    CONSTRAINT "Document_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PlaylistSong" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "artist" TEXT NOT NULL,
    "segment" TEXT NOT NULL,
    "youtubeLink" TEXT,
    "spotifyLink" TEXT,
    "notes" TEXT,
    "duration" TEXT,
    "priority" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "weddingId" TEXT NOT NULL,
    CONSTRAINT "PlaylistSong_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Gift" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "from" TEXT,
    "to" TEXT,
    "status" TEXT,
    "price" REAL,
    "imageUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "weddingId" TEXT NOT NULL,
    CONSTRAINT "Gift_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Souvenir" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "quantity" INTEGER NOT NULL,
    "pricePerUnit" REAL,
    "totalBudget" REAL,
    "vendor" TEXT,
    "status" TEXT NOT NULL,
    "audienceType" TEXT,
    "imageUrl" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "weddingId" TEXT NOT NULL,
    CONSTRAINT "Souvenir_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RundownEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "location" TEXT,
    "description" TEXT,
    "category" TEXT,
    "personInCharge" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "weddingId" TEXT NOT NULL,
    CONSTRAINT "RundownEvent_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Inspiration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT NOT NULL,
    "source" TEXT,
    "tags" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "weddingId" TEXT NOT NULL,
    CONSTRAINT "Inspiration_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
