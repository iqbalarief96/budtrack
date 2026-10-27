import prisma from '@/lib/prisma'
import { summarizeCreditCard } from '@/lib/credit-cards'
import { listSharedBills } from '@/lib/shared-bills/shared-bill-service'
import {
  calculateGoalReserve,
  calculateMonthlySafeToSpend,
} from '@/lib/safeToSpendSummary'

export type SafeToSpendMode = 'conservative' | 'forward'

export type ObligationBreakdown = {
  bills: number
  recurring: number
  subscriptions: number
  creditCards: number
  sharedBills: number
  total: number
}

export type SafeToSpendScope = {
  userId: string
  /** Wallet ids in scope. Empty = the user has no wallets. */
  walletIds: string[]
  /** True when the scope is "all wallets" (so user-level, wallet-less rows count too). */
  isAllWallets: boolean
}

/** End of the current month, local time. */
export function endOfCurrentMonth(now = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
}

/**
 * Resolve which wallet ids a safe-to-spend request covers, verifying ownership.
 * Precedence: explicit wallet > wallet group > all of the user's wallets.
 */
export async function resolveSafeToSpendScope(
  userId: string,
  opts: { walletId?: string | null; walletGroupId?: string | null }
): Promise<SafeToSpendScope> {
  if (opts.walletId) {
    const wallet = await prisma.wallet.findFirst({
      where: { id: opts.walletId, userId },
      select: { id: true },
    })
    return { userId, walletIds: wallet ? [wallet.id] : [], isAllWallets: false }
  }

  if (opts.walletGroupId) {
    const group = await prisma.walletGroup.findFirst({
      where: { id: opts.walletGroupId, userId },
      select: { wallets: { select: { walletId: true } } },
    })
    return {
      userId,
      walletIds: group ? group.wallets.map((w) => w.walletId) : [],
      isAllWallets: false,
    }
  }

  const wallets = await prisma.wallet.findMany({ where: { userId }, select: { id: true } })
  return { userId, walletIds: wallets.map((w) => w.id), isAllWallets: true }
}

/**
 * Sum every real commitment due on or before `until` for the given scope.
 * Overdue items (due date already past, still unpaid) are included because the
 * money is still owed.
 */
export async function collectUpcomingObligations(
  scope: SafeToSpendScope,
  until: Date
): Promise<ObligationBreakdown> {
  const { userId, walletIds, isAllWallets } = scope
  // Rows that carry a REQUIRED walletId; if the user has no wallets there is
  // nothing to sum, and an empty `in: []` would (correctly) match nothing.
  const walletScoped = { in: walletIds }
  // Rows whose walletId is optional: in the all-wallets view also count the
  // ones not tied to any wallet; when scoped to specific wallets, don't, to
  // avoid charging a user-level obligation against one arbitrary wallet.
  const optionalWalletFilter = isAllWallets
    ? { OR: [{ walletId: { in: walletIds } }, { walletId: null }] }
    : { walletId: { in: walletIds } }

  const [bills, recurring, subscriptions, creditCards, sharedBills] = await Promise.all([
    prisma.bill.findMany({
      where: { userId, isPaid: false, walletId: walletScoped, dueDate: { lte: until } },
      select: { amount: true },
    }),
    prisma.recurringTransaction.findMany({
      where: {
        userId,
        isActive: true,
        walletId: walletScoped,
        nextPaymentDate: { lte: until },
      },
      select: { amount: true, type: true },
    }),
    prisma.subscriptionTracker.findMany({
      where: {
        userId,
        status: { in: ['active', 'trial'] },
        nextBillingAt: { lte: until },
        ...optionalWalletFilter,
      },
      select: { amount: true },
    }),
    prisma.creditCard.findMany({
      where: { userId, status: 'active', ...optionalWalletFilter },
      select: { creditLimit: true, currentBalance: true, statementDay: true, dueDay: true, minimumPaymentRate: true },
    }),
    listSharedBills(userId, {}),
  ])

  const billsTotal = sum(bills.map((b) => b.amount))

  // Only recurring EXPENSES are obligations; recurring income is handled as
  // expected income (forward mode), not here.
  const recurringTotal = sum(
    recurring.filter((r) => (r.type || '').toUpperCase() === 'EXPENSE').map((r) => r.amount)
  )

  const subscriptionsTotal = sum(subscriptions.map((s) => s.amount))

  // The true obligation on a card before its due date is the minimum payment.
  const creditCardsTotal = sum(
    creditCards
      .filter((c) => summarizeCreditCard(c).nextDueDate <= until)
      .map((c) => summarizeCreditCard(c).minimumPayment)
  )

  // Outstanding = total − amounts participants have already paid. Count bills
  // that are undated or due within the horizon, and only within scope.
  const sharedBillsTotal = sum(
    sharedBills
      .filter((b: any) => {
        const inScope = isAllWallets
          ? true
          : (b.walletId && walletIds.includes(b.walletId))
        const dueInWindow = !b.dueDate || new Date(b.dueDate) <= until
        return inScope && dueInWindow && b.status !== 'paid' && b.status !== 'cancelled'
      })
      .map((b: any) => {
        const paid = (b.participants || []).reduce((s: number, p: any) => s + (p.paidAmount || 0), 0)
        return Math.max(0, (b.totalAmount || 0) - paid)
      })
  )

  const total = billsTotal + recurringTotal + subscriptionsTotal + creditCardsTotal + sharedBillsTotal
  return {
    bills: round(billsTotal),
    recurring: round(recurringTotal),
    subscriptions: round(subscriptionsTotal),
    creditCards: round(creditCardsTotal),
    sharedBills: round(sharedBillsTotal),
    total: round(total),
  }
}

/** Recurring income expected before `until` (used only in forward mode). */
export async function collectExpectedIncome(scope: SafeToSpendScope, until: Date): Promise<number> {
  const recurring = await prisma.recurringTransaction.findMany({
    where: {
      userId: scope.userId,
      isActive: true,
      walletId: { in: scope.walletIds },
      nextPaymentDate: { lte: until },
    },
    select: { amount: true, type: true },
  })
  return round(
    sum(recurring.filter((r) => (r.type || '').toUpperCase() === 'INCOME').map((r) => r.amount))
  )
}

export type SafeToSpendResult = {
  safeToSpend: number
  balance: number
  expectedIncome: number
  goalReserve: number
  buffer: number
  obligations: ObligationBreakdown
  horizon: string
  mode: SafeToSpendMode
  confidence: 'low' | 'medium' | 'high'
}

/**
 * Full safe-to-spend computation for a resolved scope. Single source of truth
 * shared by the dashboard endpoint and the chatbot summary.
 */
export async function computeSafeToSpend(
  scope: SafeToSpendScope,
  opts: {
    balance: number
    mode?: SafeToSpendMode
    /** Minimum cash floor to protect. */
    buffer?: number
    now?: Date
    /** Confidence hint from the caller (e.g. based on transaction volume). */
    confidence?: 'low' | 'medium' | 'high'
  }
): Promise<SafeToSpendResult> {
  const now = opts.now ?? new Date()
  const until = endOfCurrentMonth(now)
  const mode: SafeToSpendMode = opts.mode ?? 'conservative'

  const [obligations, expectedIncomeRaw, goals] = await Promise.all([
    collectUpcomingObligations(scope, until),
    mode === 'forward' ? collectExpectedIncome(scope, until) : Promise.resolve(0),
    prisma.goal.findMany({
      where: { userId: scope.userId, isArchived: false, status: { not: 'COMPLETED' } },
      select: { target: true, current: true },
    }),
  ])

  const remainingGoalAmount = goals.reduce(
    (s, g) => s + Math.max((g.target || 0) - (g.current || 0), 0),
    0
  )
  const goalReserve = calculateGoalReserve({ balance: opts.balance, remainingGoalAmount })
  const buffer = Math.max(0, Math.round(opts.buffer ?? 0))

  const safeToSpend = calculateMonthlySafeToSpend({
    balance: opts.balance,
    expectedIncome: expectedIncomeRaw,
    upcomingObligations: obligations.total,
    goalReserve,
    buffer,
  })

  return {
    safeToSpend,
    balance: Math.round(opts.balance),
    expectedIncome: expectedIncomeRaw,
    goalReserve,
    buffer,
    obligations,
    horizon: until.toISOString(),
    mode,
    confidence: opts.confidence ?? 'medium',
  }
}

function sum(values: number[]): number {
  return values.reduce((s, v) => s + (Number.isFinite(v) ? v : 0), 0)
}

function round(value: number): number {
  return Math.max(0, Math.round(value))
}
