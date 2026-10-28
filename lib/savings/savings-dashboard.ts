import prisma from '@/lib/prisma'
import { calculateWalletBalances } from '@/lib/walletBalance'
import { detectSavingsBucket } from './savings-detection'

function monthKey(date: Date) {
  return date.toISOString().slice(0, 7)
}

export async function getSavingsDashboard(userId: string) {
  const wallets = await prisma.wallet.findMany({
    where: { userId, type: 'SAVINGS' },
    include: { transactions: { where: { type: 'INCOME' }, orderBy: { date: 'desc' } } },
  })
  // Balances from transactions (the Wallet.balance column drifts).
  const balances = await calculateWalletBalances(wallets.map((w) => w.id))
  const balanceOf = (id: string) => balances.get(id) ?? 0
  wallets.sort((a, b) => balanceOf(b.id) - balanceOf(a.id))

  const now = new Date()
  const thisMonth = now.toISOString().slice(0, 7)
  const monthly = new Map<string, number>()
  let totalContributedAllTime = 0
  let totalContributedThisMonth = 0

  const walletRows = wallets.map((wallet) => {
    let contributedAllTime = 0
    let contributedThisMonth = 0
    for (const tx of wallet.transactions) {
      contributedAllTime += tx.amount
      totalContributedAllTime += tx.amount
      const key = monthKey(tx.date)
      monthly.set(key, (monthly.get(key) || 0) + tx.amount)
      if (key === thisMonth) {
        contributedThisMonth += tx.amount
        totalContributedThisMonth += tx.amount
      }
    }
    const last = wallet.transactions[0]
    return {
      walletId: wallet.id,
      name: wallet.name,
      icon: wallet.icon,
      color: wallet.color,
      balance: balanceOf(wallet.id),
      contributedThisMonth,
      contributedAllTime,
      lastContributionDate: last?.date.toISOString() ?? null,
      lastContributionAmount: last?.amount ?? null,
    }
  })

  const unmappedTx = await prisma.transaction.findMany({
    where: {
      userId,
      type: 'EXPENSE',
      migratedTransactions: { none: {} },
      category: {
        OR: [
          { name: { contains: 'Savings' } },
          { name: { contains: 'savings' } },
          { name: { contains: 'Tabungan' } },
          { name: { contains: 'tabungan' } },
          { type: { in: ['SAVINGS', 'Savings', 'savings'] } },
        ],
      },
    },
    include: { category: true },
    orderBy: { date: 'desc' },
    take: 20,
  })

  return {
    totalBalance: walletRows.reduce((sum, wallet) => sum + wallet.balance, 0),
    totalContributedThisMonth,
    totalContributedAllTime,
    walletCount: walletRows.length,
    wallets: walletRows,
    monthlyTrend: [...monthly.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, amount]) => ({ month, amount })),
    unmapped: unmappedTx.map((tx) => ({
      transactionId: tx.id,
      date: tx.date.toISOString(),
      description: tx.description || '',
      amount: tx.amount,
      detectedLabel: detectSavingsBucket(tx.description || '', tx.category?.name || '').label,
    })),
  }
}
