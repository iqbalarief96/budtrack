import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { calculateWalletBalances } from '@/lib/walletBalance'
import { netWorthCalculator } from '@/lib/net-worth/calculator'
import { snapshotService } from '@/lib/net-worth/snapshot-service'
import type { NetWorthResponse } from '@/app/types/net-worth'

export const dynamic = 'force-dynamic'

type NetWorthRoadmapItem = {
  id: string
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
  impact: number
}

function buildRoadmap(input: {
  netWorth: number
  totalAssets: number
  totalLiabilities: number
  creditCardBalance: number
  availableCash: number
  investmentAssets: number
  emergencyFund: number
}): NetWorthRoadmapItem[] {
  const items: NetWorthRoadmapItem[] = []
  const liabilityRatio = input.totalAssets > 0 ? input.totalLiabilities / input.totalAssets : input.totalLiabilities > 0 ? 1 : 0
  const investmentRatio = input.totalAssets > 0 ? input.investmentAssets / input.totalAssets : 0
  const emergencyMonths = input.emergencyFund > 0 ? input.emergencyFund : input.availableCash

  if (input.creditCardBalance > 0) {
    items.push({
      id: 'pay-credit-card',
      title: 'Pay down credit card balances first',
      description: 'Credit card balances are now counted as net-worth liabilities. Reduce this first to improve net worth and lower utilization risk.',
      priority: 'high',
      impact: input.creditCardBalance,
    })
  }

  if (liabilityRatio >= 0.4) {
    items.push({
      id: 'debt-ratio',
      title: 'Lower household liability ratio',
      description: `Liabilities are ${(liabilityRatio * 100).toFixed(1)}% of assets. Prioritize extra principal payments before increasing lifestyle spend.`,
      priority: 'high',
      impact: input.totalLiabilities,
    })
  }

  if (emergencyMonths < 3_000_000) {
    items.push({
      id: 'cash-buffer',
      title: 'Build a stronger cash buffer',
      description: 'Cash buffer looks thin. Route surplus into savings before adding risk assets.',
      priority: 'medium',
      impact: Math.max(0, 3_000_000 - emergencyMonths),
    })
  }

  if (investmentRatio < 0.2 && input.netWorth > 0) {
    items.push({
      id: 'investable-assets',
      title: 'Grow investable assets',
      description: `Investment assets are ${(investmentRatio * 100).toFixed(1)}% of assets. Gradually move surplus into long-term investment wallets once debts are controlled.`,
      priority: 'medium',
      impact: Math.max(0, input.totalAssets * 0.2 - input.investmentAssets),
    })
  }

  if (items.length === 0) {
    items.push({
      id: 'maintain-positive-trend',
      title: 'Maintain positive net-worth trend',
      description: 'Core net-worth structure looks healthy. Keep taking monthly snapshots and rebalance surplus between debt payoff, savings, and investments.',
      priority: 'low',
      impact: input.netWorth,
    })
  }

  return items.sort((a, b) => {
    const order = { high: 3, medium: 2, low: 1 }
    return order[b.priority] - order[a.priority] || b.impact - a.impact
  })
}

/**
 * GET /api/net-worth
 * Returns current net worth with breakdown, change, roadmap, and household/group summary.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    const [rawWallets, debts, creditCards, rawWalletGroups] = await Promise.all([
      prisma.wallet.findMany({
        where: { userId },
        select: { id: true, name: true, balance: true, type: true, currencyCode: true },
      }),
      prisma.debt.findMany({
        where: { userId },
        select: { id: true, name: true, currentBalance: true, type: true, isActive: true },
      }),
      prisma.creditCard.findMany({
        where: { userId, status: { not: 'closed' } },
        select: { id: true, name: true, currentBalance: true, status: true },
      }),
      prisma.walletGroup.findMany({
        where: { userId },
        include: { wallets: { include: { wallet: { select: { id: true, name: true, balance: true, type: true } } } } },
      }),
    ])

    // Balances from transactions (the Wallet.balance column drifts).
    const balances = await calculateWalletBalances([
      ...rawWallets.map((w) => w.id),
      ...rawWalletGroups.flatMap((g) => g.wallets.map((m) => m.wallet.id)),
    ])
    const bal = (id: string) => balances.get(id) ?? 0
    const wallets = rawWallets.map((w) => ({ ...w, balance: bal(w.id) }))
    const walletGroups = rawWalletGroups.map((g) => ({
      ...g,
      wallets: g.wallets.map((m) => ({ ...m, wallet: { ...m.wallet, balance: bal(m.wallet.id) } })),
    }))

    const creditCardDebts = creditCards.map((card) => ({
      id: card.id,
      name: card.name,
      currentBalance: card.currentBalance,
      type: 'CREDIT_CARD',
      isActive: card.status !== 'closed',
    }))

    const calculation = netWorthCalculator.calculate(wallets, [...debts, ...creditCardDebts])
    const latestSnapshot = await snapshotService.getLatestSnapshot(userId)

    let change = null
    let previousNetWorth = null

    if (latestSnapshot) {
      previousNetWorth = latestSnapshot.netWorth
      change = netWorthCalculator.calculateChange(calculation.netWorth, previousNetWorth)
    }

    const creditCardBalance = creditCards.reduce((sum, card) => sum + card.currentBalance, 0)
    const availableCash = wallets.filter((wallet) => wallet.type !== 'INVESTMENT').reduce((sum, wallet) => sum + wallet.balance, 0)
    const investmentAssets = wallets.filter((wallet) => wallet.type === 'INVESTMENT').reduce((sum, wallet) => sum + wallet.balance, 0)

    const household = {
      groups: walletGroups.map((group) => {
        const groupWallets = group.wallets.map((member) => member.wallet)
        const assets = groupWallets.reduce((sum, wallet) => sum + wallet.balance, 0)
        return {
          id: group.id,
          name: group.name,
          walletCount: groupWallets.length,
          totalAssets: assets,
          netWorthShare: calculation.totalAssets > 0 ? (assets / calculation.totalAssets) * 100 : 0,
          wallets: groupWallets,
        }
      }),
      totalGroupedAssets: walletGroups.reduce(
        (sum, group) => sum + group.wallets.reduce((groupSum, member) => groupSum + member.wallet.balance, 0),
        0
      ),
    }

    const roadmap = buildRoadmap({
      netWorth: calculation.netWorth,
      totalAssets: calculation.totalAssets,
      totalLiabilities: calculation.totalLiabilities,
      creditCardBalance,
      availableCash,
      investmentAssets,
      emergencyFund: availableCash,
    })

    const response: NetWorthResponse & {
      roadmap: NetWorthRoadmapItem[]
      household: typeof household
      aggregation: {
        walletAssets: number
        debtLiabilities: number
        creditCardLiabilities: number
        availableCash: number
        investmentAssets: number
      }
    } = {
      calculation,
      change,
      previousNetWorth,
      roadmap,
      household,
      aggregation: {
        walletAssets: wallets.reduce((sum, wallet) => sum + wallet.balance, 0),
        debtLiabilities: debts.filter((debt) => debt.isActive).reduce((sum, debt) => sum + debt.currentBalance, 0),
        creditCardLiabilities: creditCardBalance,
        availableCash,
        investmentAssets,
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching net worth:', error)
    return NextResponse.json({ error: 'Failed to fetch net worth' }, { status: 500 })
  }
}
