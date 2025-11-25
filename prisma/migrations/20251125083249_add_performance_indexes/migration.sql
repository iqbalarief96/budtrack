-- CreateIndex
CREATE INDEX "Transaction_walletId_date_idx" ON "Transaction"("walletId", "date");

-- CreateIndex
CREATE INDEX "Transaction_userId_type_categoryId_idx" ON "Transaction"("userId", "type", "categoryId");

-- CreateIndex
CREATE INDEX "Wallet_userId_idx" ON "Wallet"("userId");

-- CreateIndex
CREATE INDEX "Wallet_userId_type_idx" ON "Wallet"("userId", "type");

-- CreateIndex
CREATE INDEX "Wallet_isDefault_idx" ON "Wallet"("isDefault");
