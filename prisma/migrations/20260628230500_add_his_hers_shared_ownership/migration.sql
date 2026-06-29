-- Add His / Hers / Shared ownership labels for household shared bills
ALTER TABLE "shared_bills" ADD COLUMN "ownership" TEXT NOT NULL DEFAULT 'SHARED';
ALTER TABLE "shared_bill_participants" ADD COLUMN "ownerRole" TEXT NOT NULL DEFAULT 'SHARED';

CREATE INDEX "shared_bills_ownership_idx" ON "shared_bills"("ownership");
CREATE INDEX "shared_bill_participants_ownerRole_idx" ON "shared_bill_participants"("ownerRole");
