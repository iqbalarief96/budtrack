-- CreateTable
CREATE TABLE "Goal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "target" REAL NOT NULL,
    "current" REAL NOT NULL DEFAULT 0,
    "startDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "targetDate" DATETIME NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "color" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ONGOING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "Goal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
