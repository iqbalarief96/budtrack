/**
 * Savings classification shared by the dashboard (client), insights and
 * safe-to-spend (server). Keep this file dependency-free so it can be bundled
 * on the client.
 */

// Keep this narrow on purpose: generic words like "rumah" would mis-flag
// everyday categories such as "Kebutuhan Rumah".
const SAVINGS_CATEGORY_PATTERN =
  /\b(tabungan|nabung|menabung|saving|savings|investasi|investment|reksa ?dana|reksadana|saham|deposito|dana darurat|emergency fund|emas|logam mulia|crypto|kripto)\b/i

export function isSavingsCategoryName(name: string): boolean {
  return SAVINGS_CATEGORY_PATTERN.test(name)
}

// Same rule the transaction flow uses to auto-route an expense into a savings
// wallet (lib/savings/auto-route.ts), so analysis and routing agree.
const SAVINGS_TRANSFER_TEXT = /saving|savings|tabungan|menabung/i

/** True when an EXPENSE is really money moved into savings/investments. */
export function isSavingsTransaction(tx: {
  description?: string | null
  categoryName?: string | null
  categoryType?: string | null
}): boolean {
  if ((tx.categoryType || '').toUpperCase() === 'SAVINGS') return true
  if (tx.categoryName && isSavingsCategoryName(tx.categoryName)) return true
  return SAVINGS_TRANSFER_TEXT.test(`${tx.description || ''} ${tx.categoryName || ''}`)
}
