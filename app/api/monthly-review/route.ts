import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

type CategorySummary = {
  id: string | null
  name: string
  amount: number
  count: number
  percentage: number
}

function parseMonth(value: string | null) {
  const now = new Date()
  if (!value || !/^\d{4}-\d{2}$/.test(value)) {
    return { year: now.getFullYear(), monthIndex: now.getMonth() }
  }

  const [year, month] = value.split('-').map(Number)
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return { year: now.getFullYear(), monthIndex: now.getMonth() }
  }

  return { year, monthIndex: month - 1 }
}

function monthBounds(year: number, monthIndex: number) {
  return {
    start: new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0)),
    end: new Date(Date.UTC(year, monthIndex + 1, 0, 23, 59, 59, 999)),
  }
}

function toIsoMonth(date: Date) {
  return date.toISOString().slice(0, 7)
}

function daysBetween(from: Date, to: Date) {
  const ms = to.getTime() - from.getTime()
  return Math.ceil(ms / (1000 * 60 * 60 * 24))
}

function monthlyEquivalent(amount: number, cycle: string) {
  switch (cycle) {
    case 'weekly':
      return amount * 4.345
    case 'quarterly':
      return amount / 3
    case 'yearly':
      return amount / 12
    case 'one_time':
    case 'trial_only':
      return 0
    case 'monthly':
    default:
      return amount
  }
}

function buildCategorySummary(
  transactions: Array<{ amount: number; category: { id: string; name: string } | null }>,
  totalExpense: number
): CategorySummary[] {
  const bucket = new Map<string, CategorySummary>()

  for (const transaction of transactions) {
    const id = transaction.category?.id ?? 'uncategorized'
    const name = transaction.category?.name ?? 'Uncategorized'
    const current = bucket.get(id) ?? { id: transaction.category?.id ?? null, name, amount: 0, count: 0, percentage: 0 }
    current.amount += transaction.amount
    current.count += 1
    bucket.set(id, current)
  }

  return [...bucket.values()]
    .map((item) => ({
      ...item,
      percentage: totalExpense > 0 ? (item.amount / totalExpense) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount)
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const { year, monthIndex } = parseMonth(searchParams.get('month'))
    const { start, end } = monthBounds(year, monthIndex)
    const walletId = searchParams.get('walletId')
    const walletGroupId = searchParams.get('walletGroupId')

    let walletIds: string[] | undefined
    let scope: { type: 'all' | 'wallet' | 'walletGroup'; label: string; walletIds?: string[] } = {
      type: 'all',
      label: 'All wallets',
    }

    if (walletGroupId) {
      const group = await prisma.walletGroup.findFirst({
        where: { id: walletGroupId, userId: session.user.id },
        include: { wallets: { include: { wallet: { select: { id: true, name: true } } } } },
      })

      if (!group) {
        return NextResponse.json({ error: 'Wallet group not found' }, { status: 404 })
      }

      walletIds = group.wallets.map((member) => member.walletId)
      scope = { type: 'walletGroup', label: group.name, walletIds }
    } else if (walletId) {
      const wallet = await prisma.wallet.findFirst({
        where: { id: walletId, userId: session.user.id },
        select: { id: true, name: true },
      })

      if (!wallet) {
        return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })
      }

      walletIds = [wallet.id]
      scope = { type: 'wallet', label: wallet.name, walletIds }
    }

    const walletFilter = walletIds ? { walletId: { in: walletIds } } : {}
    const sharedWalletFilter = walletIds ? { walletId: { in: walletIds } } : {}

    const [transactions, previousTransactions, budgets, bills, subscriptions, sharedBills, goals] = await Promise.all([
      prisma.transaction.findMany({
        where: {
          userId: session.user.id,
          date: { gte: start, lte: end },
          ...walletFilter,
        },
        include: {
          category: { select: { id: true, name: true } },
          wallet: { select: { id: true, name: true, color: true } },
        },
        orderBy: { date: 'desc' },
      }),
      prisma.transaction.findMany({
        where: {
          userId: session.user.id,
          date: {
            gte: new Date(Date.UTC(year, monthIndex - 1, 1, 0, 0, 0, 0)),
            lte: new Date(Date.UTC(year, monthIndex, 0, 23, 59, 59, 999)),
          },
          ...walletFilter,
        },
        select: { amount: true, type: true },
      }),
      prisma.budget.findMany({
        where: {
          userId: session.user.id,
          startDate: { lte: end },
          endDate: { gte: start },
          ...walletFilter,
        },
        include: {
          category: { select: { id: true, name: true } },
          wallet: { select: { id: true, name: true } },
        },
        orderBy: { endDate: 'asc' },
      }),
      prisma.bill.findMany({
        where: {
          userId: session.user.id,
          OR: [
            { dueDate: { gte: start, lte: end } },
            { paidDate: { gte: start, lte: end } },
          ],
          ...walletFilter,
        },
        include: {
          category: { select: { id: true, name: true } },
          wallet: { select: { id: true, name: true } },
        },
        orderBy: { dueDate: 'asc' },
      }),
      prisma.subscriptionTracker.findMany({
        where: {
          userId: session.user.id,
          status: { in: ['trial', 'active'] },
          ...(walletIds ? { OR: [{ walletId: { in: walletIds } }, { walletId: null }] } : {}),
        },
        include: { wallet: { select: { id: true, name: true } } },
        orderBy: { nextBillingAt: 'asc' },
      }),
      prisma.sharedBill.findMany({
        where: {
          userId: session.user.id,
          OR: [
            { dueDate: { gte: start, lte: end } },
            { paidAt: { gte: start, lte: end } },
          ],
          ...(walletGroupId ? { walletGroupId } : sharedWalletFilter),
        },
        include: {
          participants: true,
          wallet: { select: { id: true, name: true } },
          walletGroup: { select: { id: true, name: true } },
        },
        orderBy: { dueDate: 'asc' },
      }),
      prisma.goal.findMany({
        where: {
          userId: session.user.id,
          isArchived: false,
        },
        orderBy: [{ deadline: 'asc' }, { updatedAt: 'desc' }],
      }),
    ])

    const incomeTransactions = transactions.filter((transaction) => transaction.type === 'INCOME')
    const expenseTransactions = transactions.filter((transaction) => transaction.type === 'EXPENSE')
    const totalIncome = incomeTransactions.reduce((sum, transaction) => sum + transaction.amount, 0)
    const totalExpense = expenseTransactions.reduce((sum, transaction) => sum + transaction.amount, 0)
    const netCashflow = totalIncome - totalExpense

    const previousIncome = previousTransactions
      .filter((transaction) => transaction.type === 'INCOME')
      .reduce((sum, transaction) => sum + transaction.amount, 0)
    const previousExpense = previousTransactions
      .filter((transaction) => transaction.type === 'EXPENSE')
      .reduce((sum, transaction) => sum + transaction.amount, 0)

    const budgetTotal = budgets.reduce((sum, budget) => sum + budget.amount, 0)
    const budgetSpent = budgets.reduce((sum, budget) => sum + budget.spent, 0)
    const overBudgetCount = budgets.filter((budget) => budget.spent > budget.amount).length
    const budgetUsage = budgetTotal > 0 ? (budgetSpent / budgetTotal) * 100 : 0

    const billTotal = bills.reduce((sum, bill) => sum + bill.amount, 0)
    const paidBillTotal = bills.filter((bill) => bill.isPaid).reduce((sum, bill) => sum + bill.amount, 0)
    const unpaidBillTotal = bills.filter((bill) => !bill.isPaid).reduce((sum, bill) => sum + bill.amount, 0)

    const sharedBillTotal = sharedBills.reduce((sum, bill) => sum + bill.totalAmount, 0)
    const sharedBillPaid = sharedBills.reduce(
      (sum, bill) => sum + bill.participants.reduce((participantSum, participant) => participantSum + participant.paidAmount, 0),
      0
    )

    const subscriptionMonthlyTotal = subscriptions.reduce(
      (sum, subscription) => sum + monthlyEquivalent(subscription.amount, subscription.billingCycle),
      0
    )
    const upcomingSubscriptions = subscriptions.filter((subscription) => {
      if (!subscription.nextBillingAt) return false
      return subscription.nextBillingAt >= start && subscription.nextBillingAt <= end
    })

    const activeGoals = goals.filter((goal) => goal.status !== 'COMPLETED')
    const completedGoals = goals.filter((goal) => goal.status === 'COMPLETED' || goal.current >= goal.target)
    const goalTargetTotal = activeGoals.reduce((sum, goal) => sum + goal.target, 0)
    const goalCurrentTotal = activeGoals.reduce((sum, goal) => sum + goal.current, 0)

    const categoryBreakdown = buildCategorySummary(expenseTransactions, totalExpense)
    const largestExpense = expenseTransactions.sort((a, b) => b.amount - a.amount)[0] ?? null
    const today = new Date()
    const overdueBills = bills.filter((bill) => !bill.isPaid && bill.dueDate < today)
    const dueSoonBills = bills.filter((bill) => !bill.isPaid && bill.dueDate >= today && daysBetween(today, bill.dueDate) <= 7)
    const atRiskBudgets = budgets
      .map((budget) => ({
        id: budget.id,
        category: budget.category.name,
        wallet: budget.wallet.name,
        amount: budget.amount,
        spent: budget.spent,
        remaining: budget.amount - budget.spent,
        percentage: budget.amount > 0 ? (budget.spent / budget.amount) * 100 : 0,
        endDate: budget.endDate,
      }))
      .filter((budget) => budget.percentage >= 80)
      .sort((a, b) => b.percentage - a.percentage)

    return NextResponse.json({
      period: {
        month: toIsoMonth(start),
        start: start.toISOString(),
        end: end.toISOString(),
        label: start.toLocaleDateString('id-ID', { month: 'long', year: 'numeric', timeZone: 'UTC' }),
      },
      scope,
      summary: {
        totalIncome,
        totalExpense,
        netCashflow,
        savingsRate: totalIncome > 0 ? (netCashflow / totalIncome) * 100 : 0,
        transactionCount: transactions.length,
        incomeCount: incomeTransactions.length,
        expenseCount: expenseTransactions.length,
        previousIncome,
        previousExpense,
        previousNetCashflow: previousIncome - previousExpense,
      },
      categories: categoryBreakdown,
      budgets: {
        total: budgetTotal,
        spent: budgetSpent,
        remaining: budgetTotal - budgetSpent,
        usage: budgetUsage,
        count: budgets.length,
        overBudgetCount,
        atRisk: atRiskBudgets,
      },
      bills: {
        total: billTotal,
        paid: paidBillTotal,
        unpaid: unpaidBillTotal,
        count: bills.length,
        paidCount: bills.filter((bill) => bill.isPaid).length,
        unpaidCount: bills.filter((bill) => !bill.isPaid).length,
        overdue: overdueBills.map((bill) => ({ id: bill.id, name: bill.name, amount: bill.amount, dueDate: bill.dueDate })),
        dueSoon: dueSoonBills.map((bill) => ({ id: bill.id, name: bill.name, amount: bill.amount, dueDate: bill.dueDate })),
      },
      subscriptions: {
        monthlyEquivalent: subscriptionMonthlyTotal,
        activeCount: subscriptions.length,
        upcomingCount: upcomingSubscriptions.length,
        upcoming: upcomingSubscriptions.slice(0, 8).map((subscription) => ({
          id: subscription.id,
          name: subscription.name,
          provider: subscription.provider,
          amount: subscription.amount,
          billingCycle: subscription.billingCycle,
          nextBillingAt: subscription.nextBillingAt,
          wallet: subscription.wallet?.name ?? null,
        })),
      },
      sharedBills: {
        total: sharedBillTotal,
        paid: sharedBillPaid,
        outstanding: Math.max(0, sharedBillTotal - sharedBillPaid),
        count: sharedBills.length,
        openCount: sharedBills.filter((bill) => bill.status === 'open' || bill.status === 'partially_paid').length,
      },
      goals: {
        activeCount: activeGoals.length,
        completedCount: completedGoals.length,
        targetTotal: goalTargetTotal,
        currentTotal: goalCurrentTotal,
        progress: goalTargetTotal > 0 ? (goalCurrentTotal / goalTargetTotal) * 100 : 0,
        top: goals.slice(0, 6).map((goal) => ({
          id: goal.id,
          name: goal.name,
          target: goal.target,
          current: goal.current,
          deadline: goal.deadline,
          status: goal.status,
          progress: goal.target > 0 ? (goal.current / goal.target) * 100 : 0,
        })),
      },
      highlights: {
        largestExpense: largestExpense
          ? {
              id: largestExpense.id,
              amount: largestExpense.amount,
              description: largestExpense.description,
              date: largestExpense.date,
              category: largestExpense.category?.name ?? 'Uncategorized',
              wallet: largestExpense.wallet.name,
            }
          : null,
        topCategory: categoryBreakdown[0] ?? null,
      },
      recentTransactions: transactions.slice(0, 10).map((transaction) => ({
        id: transaction.id,
        amount: transaction.amount,
        type: transaction.type,
        description: transaction.description,
        date: transaction.date,
        category: transaction.category?.name ?? 'Uncategorized',
        wallet: transaction.wallet.name,
      })),
    })
  } catch (error) {
    console.error('Error building monthly review:', error)
    return NextResponse.json({ error: 'Failed to build monthly review' }, { status: 500 })
  }
}
