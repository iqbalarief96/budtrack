import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import {
  computeSafeToSpend,
  resolveSafeToSpendScope,
  type SafeToSpendMode,
} from '@/lib/safeToSpend/upcomingObligations'
import { isSavingsTransaction } from '@/lib/savings/classify'

export const dynamic = 'force-dynamic'

/**
 * GET /api/safe-to-spend/breakdown?walletId=&walletGroupId=&mode=
 *
 * The single authoritative safe-to-spend source, used by the dashboard hero
 * card, the SafeToSpendCard widget, and (via computeSafeToSpend) the chatbot.
 *
 * Formula: balance (+ expected income in forward mode) − upcoming obligations
 *          − goal reserve − buffer.
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = session.user.id

  const { searchParams } = new URL(request.url)
  const walletId = searchParams.get('walletId')
  const walletGroupId = searchParams.get('walletGroupId')
  const walletIdsParam = searchParams.get('walletIds')
  const walletIds = walletIdsParam ? walletIdsParam.split(',').filter(Boolean) : null
  const mode: SafeToSpendMode = searchParams.get('mode') === 'forward' ? 'forward' : 'conservative'

  const scope = await resolveSafeToSpendScope(userId, { walletId, walletGroupId, walletIds })
  if (scope.walletIds.length === 0) {
    return NextResponse.json({ error: 'No wallets in scope' }, { status: 404 })
  }

  const now = new Date()

  // Balance is derived from transactions (income − expense), NOT the stored
  // wallet.balance column. The column can drift (imports, float rounding) while
  // /api/wallets and the dashboard's "Total Saldo" show the transaction-derived
  // value; safe-to-spend must match that, or the two cards disagree.
  const [incomeAgg, expenseAgg, recentExpenses, txThisMonth] = await Promise.all([
    prisma.transaction.aggregate({
      where: { userId, walletId: { in: scope.walletIds }, type: { in: ['income', 'INCOME'] } },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { userId, walletId: { in: scope.walletIds }, type: { in: ['expense', 'EXPENSE'] } },
      _sum: { amount: true },
    }),
    prisma.transaction.findMany({
      where: {
        userId,
        walletId: { in: scope.walletIds },
        type: { in: ['expense', 'EXPENSE'] },
        date: { gte: new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000) },
      },
      select: { amount: true, description: true, transferPairId: true, category: { select: { name: true, type: true } } },
    }),
    prisma.transaction.count({
      where: {
        userId,
        walletId: { in: scope.walletIds },
        date: { gte: new Date(now.getFullYear(), now.getMonth(), 1) },
      },
    }),
  ])

  // Subtract raw aggregates (don't round each side first) so this matches
  // /api/wallets exactly; computeSafeToSpend rounds the final displayed value.
  const balance = (incomeAgg._sum.amount || 0) - (expenseAgg._sum.amount || 0)
  // Buffer = a small cushion: 3 days of recent CONSUMPTION, capped at 10% of
  // the balance. (It used to be a full week of spending incl. savings
  // transfers, which ate ~90% of the balance near month-end.)
  const consumption28d = recentExpenses
    .filter((t) => !t.transferPairId && !isSavingsTransaction({ description: t.description, categoryName: t.category?.name, categoryType: t.category?.type }))
    .reduce((sum, t) => sum + Math.abs(t.amount || 0), 0)
  const avgDailyConsumption = consumption28d / 28
  const buffer = Math.round(Math.max(0, Math.min(3 * avgDailyConsumption, 0.1 * Math.max(balance, 0))))
  const confidence = txThisMonth >= 10 ? 'high' : txThisMonth >= 3 ? 'medium' : 'low'

  const result = await computeSafeToSpend(scope, { balance, mode, buffer, now, confidence })

  // Days left in the horizon (end of month), today included.
  const daysLeft = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate() + 1
  const perDay = Math.floor(result.safeToSpend / Math.max(daysLeft, 1))
  return NextResponse.json({ ...result, daysLeft, perDay })
}
