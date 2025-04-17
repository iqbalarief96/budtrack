-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Souvenir" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "weddingId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "quantity" INTEGER NOT NULL,
    "pricePerUnit" REAL NOT NULL,
    "totalBudget" REAL NOT NULL,
    "actualCostPerUnit" REAL NOT NULL DEFAULT 0,
    "totalActualCost" REAL NOT NULL DEFAULT 0,
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
INSERT INTO "new_Souvenir" ("createdAt", "deliveryDate", "description", "id", "imageUrl", "name", "notes", "orderDate", "pricePerUnit", "quantity", "status", "totalBudget", "type", "updatedAt", "vendor", "weddingId") SELECT "createdAt", "deliveryDate", "description", "id", "imageUrl", "name", "notes", "orderDate", "pricePerUnit", "quantity", "status", "totalBudget", "type", "updatedAt", "vendor", "weddingId" FROM "Souvenir";
DROP TABLE "Souvenir";
ALTER TABLE "new_Souvenir" RENAME TO "Souvenir";
CREATE INDEX "Souvenir_weddingId_idx" ON "Souvenir"("weddingId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
