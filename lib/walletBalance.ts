import prisma from '@/lib/prisma'

/**
 * Calculate wallet balance from transactions (source of truth)
 * This replaces reading from wallet.balance field
 */
export async function calculateWalletBalance(walletId: string): Promise<number> {
  const [incomeSum, expenseSum] = await Promise.all([
    prisma.transaction.aggregate({
      where: { walletId, type: 'INCOME' },
      _sum: { amount: true }
    }),
    prisma.transaction.aggregate({
      where: { walletId, type: 'EXPENSE' },
      _sum: { amount: true }
    })
  ])

  return (incomeSum._sum.amount || 0) - (expenseSum._sum.amount || 0)
}

/**
 * Calculate balances for multiple wallets
 */
export async function calculateWalletBalances(walletIds: string[]): Promise<Map<string, number>> {
  const balances = new Map<string, number>()
  
  await Promise.all(
    walletIds.map(async (walletId) => {
      const balance = await calculateWalletBalance(walletId)
      balances.set(walletId, balance)
    })
  )
  
  return balances
}

/**
 * Get wallet with calculated balance
 */
export async function getWalletWithBalance(walletId: string) {
  const [wallet, balance] = await Promise.all([
    prisma.wallet.findUnique({
      where: { id: walletId }
    }),
    calculateWalletBalance(walletId)
  ])

  if (!wallet) return null

  return {
    ...wallet,
    balance // Override stored balance with calculated
  }
}

/**
 * Get all user wallets with calculated balances
 */
export async function getUserWalletsWithBalances(userId: string) {
  const wallets = await prisma.wallet.findMany({
    where: { userId },
    orderBy: [{ isDefault: 'desc' }, { name: 'asc' }]
  })

  const walletsWithBalances = await Promise.all(
    wallets.map(async (wallet) => ({
      ...wallet,
      balance: await calculateWalletBalance(wallet.id)
    }))
  )

  return walletsWithBalances
}

/**
 * Calculate total balance across all user wallets
 */
export async function calculateTotalBalance(userId: string): Promise<number> {
  const wallets = await prisma.wallet.findMany({
    where: { userId },
    select: { id: true }
  })

  const balances = await Promise.all(
    wallets.map(w => calculateWalletBalance(w.id))
  )

  return balances.reduce((sum, bal) => sum + bal, 0)
}
