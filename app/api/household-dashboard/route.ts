import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

function startOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function endOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function uniq(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)))
}

function normalizeType(type: string | null | undefined) {
  return String(type || '').toLowerCase()
}

function monthlySubscriptionAmount(amount: number, cycle: string) {
  const normalized = cycle.toLowerCase()
  if (normalized === 'yearly') return amount / 12
  if (normalized === 'quarterly') return amount / 3
  if (normalized === 'weekly') return amount * 4.345
  if (normalized === 'one_time' || normalized === 'trial_only') return 0
  return amount
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userId = session.user.id
    const { searchParams } = new URL(request.url)
    const walletId = searchParams.get('walletId') || undefined
    const walletGroupId = searchParams.get('walletGroupId') || undefined
    const today = new Date()
    const monthStart = startOfMonth(today)
    const monthEnd = endOfMonth(today)
    const dueSoonUntil = addDays(today, 14)

    const ownedWallets = await prisma.wallet.findMany({
      where: { userId },
      select: { id: true, name: true, balance: true, currencyCode: true, color: true, type: true },
      orderBy: { name: 'asc' },
    })

    let scopedWalletIds = ownedWallets.map((wallet) => wallet.id)
    let scope: any = { type: 'all', name: 'All wallets' }

    if (walletGroupId) {
      const group = await prisma.walletGroup.findFirst({
        where: { id: walletGroupId, userId },
        include: { wallets: { include: { wallet: true } } },
      })
      if (!group) return NextResponse.json({ error: 'Wallet group not found' }, { status: 404 })
      scopedWalletIds = group.wallets.map((member) => member.walletId)
      scope = { type: 'walletGroup', id: group.id, name: group.name }
    } else if (walletId) {
      const wallet = ownedWallets.find((item) => item.id === walletId)
      if (!wallet) return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })
      scopedWalletIds = [wallet.id]
      scope = { type: 'wallet', id: wallet.id, name: wallet.name }
    }

    scopedWalletIds = uniq(scopedWalletIds)
    const walletWhere = scopedWalletIds.length ? { in: scopedWalletIds } : { in: ['__no_wallets__'] }

    const [transactions, budgets, bills, subscriptions, sharedBills, goals, walletGroups] = await Promise.all([
      prisma.transaction.findMany({
        where: { userId, walletId: walletWhere, date: { gte: monthStart, lte: monthEnd } },
        include: { category: { select: { id: true, name: true, color: true, type: true } }, wallet: { select: { id: true, name: true } } },
        orderBy: { date: 'desc' },
      }),
      prisma.budget.findMany({
        where: { userId, walletId: walletWhere, startDate: { lte: today }, endDate: { gte: today } },
        include: { category: { select: { id: true, name: true, color: true } }, wallet: { select: { id: true, name: true } } },
        orderBy: { endDate: 'asc' },
      }),
      prisma.bill.findMany({
        where: { userId, walletId: walletWhere, isPaid: false, dueDate: { lte: dueSoonUntil } },
        include: { wallet: { select: { id: true, name: true } }, category: { select: { id: true, name: true, color: true } } },
        orderBy: { dueDate: 'asc' },
        take: 10,
      }),
      prisma.subscriptionTracker.findMany({
        where: { userId, status: { in: ['trial', 'active'] }, OR: [{ walletId: walletWhere }, { walletId: null }] },
        include: { wallet: { select: { id: true, name: true } } },
        orderBy: { nextBillingAt: 'asc' },
      }),
      prisma.sharedBill.findMany({
        where: {
          userId,
          status: { in: ['open', 'partially_paid'] },
          OR: walletGroupId
            ? [{ walletGroupId }, { walletId: walletWhere }]
            : [{ walletId: walletWhere }, { walletId: null, walletGroupId: null }],
        },
        include: { participants: true, wallet: { select: { id: true, name: true } }, walletGroup: { select: { id: true, name: true } } },
        orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
      }),
      prisma.goal.findMany({
        where: { userId, isArchived: false, status: { in: ['ONGOING', 'IN_PROGRESS', 'ACTIVE'] } },
        orderBy: { deadline: 'asc' },
        take: 8,
      }),
      prisma.walletGroup.findMany({
        where: { userId },
        include: { wallets: { include: { wallet: { select: { id: true, name: true, balance: true, color: true } } } } },
        orderBy: { name: 'asc' },
      }),
    ])

    const scopedWallets = ownedWallets.filter((wallet) => scopedWalletIds.includes(wallet.id))
    const balance = scopedWallets.reduce((sum, wallet) => sum + Number(wallet.balance || 0), 0)
    const income = transactions.filter((tx) => normalizeType(tx.type) === 'income').reduce((sum, tx) => sum + tx.amount, 0)
    const expense = transactions.filter((tx) => normalizeType(tx.type) === 'expense').reduce((sum, tx) => sum + tx.amount, 0)

    const categoryMap = new Map<string, { id: string; name: string; color?: string | null; amount: number }>()
    for (const tx of transactions) {
      if (normalizeType(tx.type) !== 'expense') continue
      const id = tx.category?.id || 'uncategorized'
      const current = categoryMap.get(id) || { id, name: tx.category?.name || 'Uncategorized', color: tx.category?.color, amount: 0 }
      current.amount += tx.amount
      categoryMap.set(id, current)
    }

    const sharedOutstanding = sharedBills.reduce((sum, bill) => {
      const paid = bill.participants.reduce((paidSum, participant) => paidSum + Number(participant.paidAmount || 0), 0)
      return sum + Math.max(0, bill.totalAmount - paid)
    }, 0)

    const budgetTotal = budgets.reduce((sum, budget) => sum + budget.amount, 0)
    const budgetSpent = budgets.reduce((sum, budget) => sum + budget.spent, 0)
    const goalTarget = goals.reduce((sum, goal) => sum + goal.target, 0)
    const goalCurrent = goals.reduce((sum, goal) => sum + goal.current, 0)
    const subscriptionMonthly = subscriptions.reduce((sum, sub) => sum + monthlySubscriptionAmount(sub.amount, sub.billingCycle), 0)

    return NextResponse.json({
      scope,
      period: { monthStart, monthEnd, dueSoonUntil },
      wallets: scopedWallets,
      walletGroups,
      summary: {
        balance,
        income,
        expense,
        cashflow: income - expense,
        transactionCount: transactions.length,
        budgetTotal,
        budgetSpent,
        budgetRemaining: Math.max(0, budgetTotal - budgetSpent),
        budgetUsagePercent: budgetTotal > 0 ? Math.round((budgetSpent / budgetTotal) * 100) : 0,
        dueBillsAmount: bills.reduce((sum, bill) => sum + bill.amount, 0),
        dueBillsCount: bills.length,
        sharedOutstanding,
        sharedOpenCount: sharedBills.length,
        subscriptionMonthly,
        activeSubscriptionCount: subscriptions.length,
        goalTarget,
        goalCurrent,
        goalProgressPercent: goalTarget > 0 ? Math.round((goalCurrent / goalTarget) * 100) : 0,
      },
      topCategories: Array.from(categoryMap.values()).sort((a, b) => b.amount - a.amount).slice(0, 6),
      budgets: budgets.map((budget) => ({
        id: budget.id,
        amount: budget.amount,
        spent: budget.spent,
        remaining: Math.max(0, budget.amount - budget.spent),
        usagePercent: budget.amount > 0 ? Math.round((budget.spent / budget.amount) * 100) : 0,
        endDate: budget.endDate,
        category: budget.category,
        wallet: budget.wallet,
      })).slice(0, 8),
      bills,
      subscriptions: subscriptions.slice(0, 8),
      sharedBills: sharedBills.slice(0, 8),
      goals: goals.map((goal) => ({
        id: goal.id,
        name: goal.name,
        target: goal.target,
        current: goal.current,
        deadline: goal.deadline,
        color: goal.color,
        icon: goal.icon,
        progressPercent: goal.target > 0 ? Math.round((goal.current / goal.target) * 100) : 0,
      })),
    })
  } catch (error) {
    console.error('Error fetching household dashboard:', error)
    return NextResponse.json({ error: 'Failed to fetch household dashboard' }, { status: 500 })
  }
}
