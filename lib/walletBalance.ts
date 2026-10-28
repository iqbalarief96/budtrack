import prisma from '@/lib/prisma'

/**
 * Wallet balances, derived from transactions: the ONLY source of truth.
 *
 * The `Wallet.balance` column is a legacy cache that several write paths
 * forget to update (receipt scan, bank import, ...), so it drifts. Nothing
 * should read it for display or calculations; use these helpers instead.
 * (Writes to the column are left in place on purpose so reverting this is
 * safe; the column can be dropped once nothing reads it.)
 */

/** income − expense per wallet, in one query. Type casing is normalized. */
export async function calculateWalletBalances(walletIds: string[]): Promise<Map<string, number>> {
  const ids = Array.from(new Set(walletIds.filter(Boolean)))
  const balances = new Map<string, number>(ids.map((id) => [id, 0]))
  if (!ids.length) return balances

  const rows = await prisma.transaction.groupBy({
    by: ['walletId', 'type'],
    where: { walletId: { in: ids } },
    _sum: { amount: true },
  })
  for (const r of rows) {
    const type = (r.type || '').toUpperCase()
    const sum = r._sum.amount || 0
    const delta = type === 'INCOME' ? sum : type === 'EXPENSE' ? -sum : 0
    balances.set(r.walletId, (balances.get(r.walletId) || 0) + delta)
  }
  return balances
}

export async function calculateWalletBalance(walletId: string): Promise<number> {
  return (await calculateWalletBalances([walletId])).get(walletId) ?? 0
}

/**
 * Returns copies of `wallets` with `balance` replaced by the computed value.
 * Works for any shape that has an `id` (the `balance` field is added if missing).
 */
export async function withComputedBalances<T extends { id: string }>(wallets: T[]): Promise<Array<T & { balance: number }>> {
  const balances = await calculateWalletBalances(wallets.map((w) => w.id))
  return wallets.map((w) => ({ ...w, balance: balances.get(w.id) ?? 0 }))
}

export async function getWalletWithBalance(walletId: string) {
  const wallet = await prisma.wallet.findUnique({ where: { id: walletId } })
  if (!wallet) return null
  return { ...wallet, balance: await calculateWalletBalance(walletId) }
}

export async function getUserWalletsWithBalances(userId: string) {
  const wallets = await prisma.wallet.findMany({
    where: { userId },
    orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
  })
  return withComputedBalances(wallets)
}

export async function calculateTotalBalance(userId: string): Promise<number> {
  const wallets = await prisma.wallet.findMany({ where: { userId }, select: { id: true } })
  const balances = await calculateWalletBalances(wallets.map((w) => w.id))
  let total = 0
  balances.forEach((v) => { total += v })
  return total
}
