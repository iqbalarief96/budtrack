-- CreateTable
CREATE TABLE "Gift" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "weddingId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "estimatedCost" REAL NOT NULL DEFAULT 0,
    "actualCost" REAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'not-started',
    "responsible" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Gift_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Gift_weddingId_idx" ON "Gift"("weddingId");
