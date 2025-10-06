-- CreateTable
CREATE TABLE "WeddingGuest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "weddingId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "relationship" TEXT,
    "contactNumber" TEXT,
    "email" TEXT,
    "address" TEXT,
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "attended" BOOLEAN NOT NULL DEFAULT false,
    "group" TEXT,
    "seats" INTEGER NOT NULL DEFAULT 1,
    "dietaryRestrictions" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WeddingGuest_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "WeddingGuest_weddingId_idx" ON "WeddingGuest"("weddingId");
