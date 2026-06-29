-- CreateTable
CREATE TABLE "ReceiptAttachment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'manual_upload',
    "storageUrl" TEXT,
    "extractedText" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReceiptAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReceiptAttachment_userId_createdAt_idx" ON "ReceiptAttachment"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ReceiptAttachment_transactionId_idx" ON "ReceiptAttachment"("transactionId");

-- AddForeignKey
ALTER TABLE "ReceiptAttachment" ADD CONSTRAINT "ReceiptAttachment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceiptAttachment" ADD CONSTRAINT "ReceiptAttachment_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
