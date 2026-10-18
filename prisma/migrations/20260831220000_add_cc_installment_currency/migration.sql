-- Add installment + multi-currency + reversal fields to credit_card_transactions
ALTER TABLE "credit_card_transactions" ADD COLUMN "installmentTenor" INTEGER;
ALTER TABLE "credit_card_transactions" ADD COLUMN "installmentTerm" INTEGER;
ALTER TABLE "credit_card_transactions" ADD COLUMN "installmentTotal" REAL;
ALTER TABLE "credit_card_transactions" ADD COLUMN "installmentPaid" REAL;
ALTER TABLE "credit_card_transactions" ADD COLUMN "originalAmount" REAL;
ALTER TABLE "credit_card_transactions" ADD COLUMN "currency" TEXT DEFAULT 'IDR';
ALTER TABLE "credit_card_transactions" ADD COLUMN "exchangeRate" REAL;
ALTER TABLE "credit_card_transactions" ADD COLUMN "reversalOfId" TEXT;
