/*
  Warnings:

  - You are about to alter the column `rating` on the `Vendor` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Float`.

*/
-- AlterTable
ALTER TABLE "Venue" ADD COLUMN "features" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Vendor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "weddingId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "contactPerson" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "address" TEXT,
    "priceRange" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "rating" REAL,
    "imageUrl" TEXT,
    "instagramHandle" TEXT,
    "notes" TEXT,
    "features" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Vendor_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Vendor" ("address", "category", "contactPerson", "createdAt", "email", "id", "imageUrl", "instagramHandle", "name", "notes", "phone", "priceRange", "rating", "status", "updatedAt", "website", "weddingId") SELECT "address", "category", "contactPerson", "createdAt", "email", "id", "imageUrl", "instagramHandle", "name", "notes", "phone", "priceRange", "rating", "status", "updatedAt", "website", "weddingId" FROM "Vendor";
DROP TABLE "Vendor";
ALTER TABLE "new_Vendor" RENAME TO "Vendor";
CREATE INDEX "Vendor_weddingId_idx" ON "Vendor"("weddingId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
