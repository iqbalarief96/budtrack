import prisma from '@/lib/prisma'
import { WalletGroupError, getGroupById } from './wallet-group-service'

/**
 * RecurringAggregationService - Aggregates recurring transaction data across wallet groups
 * Requirements: 13.1, 13.2, 13.3, 13.4
 */

// Types
export interface AggregatedRecurringTransaction {
  id: string
  name: string
  description: string | null
  amount: number
  type: 'income' | 'expense'
  frequency: string
  startDate: Date
  nextDate: Date
  category: string | null
  isActive: boolean
  walletId: string
  walletName: string
  walletColor: string | null
}

export interface WalletRecurringSummary {
  walletId: string
  walletName: string
  walletColor: string | null
  recurringIncome: number
  recurringExpense: number
  items: AggregatedRecurringTransaction[]
  itemCount: number
}

export interface AggregatedRecurring {
  recurring: AggregatedRecurringTransaction[]
  totalRecurringIncome: number
  totalRecurringExpense: number
  upcomingTransactions: AggregatedRecurringTransaction[]
  recurringByWallet: WalletRecurringSummary[]
}


/**
 * Get aggregated recurring transactions for a wallet group
 * Requirements: 13.1, 13.2, 13.3, 13.4
 * 
 * - 13.1: Display recurring transactions from all Linked_Wallets
 * - 13.2: Indicate which wallet each recurring transaction belongs to
 * - 13.3: Show total recurring income and expense amounts
 * - 13.4: Display upcoming recurring transactions from all Linked_Wallets
 */
export async function getAggregatedRecurring(
  groupId: string,
  userId: string
): Promise<AggregatedRecurring> {
  // Verify group ownership and get group with wallets
  const group = await getGroupById(groupId, userId)
  
  if (!group) {
    throw new WalletGroupError('Wallet group not found', 'GROUP_NOT_FOUND')
  }

  const walletIds = group.wallets.map((member) => member.walletId)

  if (walletIds.length === 0) {
    return {
      recurring: [],
      totalRecurringIncome: 0,
      totalRecurringExpense: 0,
      upcomingTransactions: [],
      recurringByWallet: [],
    }
  }

  // Get all recurring transactions for wallets in the group (Requirement 13.1)
  const recurringTransactions = await prisma.recurringTransaction.findMany({
    where: {
      walletId: { in: walletIds },
      userId,
    },
    include: {
      wallet: {
        select: {
          id: true,
          name: true,
          color: true,
        },
      },
    },
    orderBy: { nextPaymentDate: 'asc' },
  })

  let totalRecurringIncome = 0
  let totalRecurringExpense = 0

  // Initialize wallet summaries
  const walletSummaryMap = new Map<string, WalletRecurringSummary>()
  for (const member of group.wallets) {
    walletSummaryMap.set(member.walletId, {
      walletId: member.walletId,
      walletName: member.wallet.name,
      walletColor: member.wallet.color || null,
      recurringIncome: 0,
      recurringExpense: 0,
      items: [],
      itemCount: 0,
    })
  }

  // Process recurring transactions (Requirement 13.2 - include wallet info)
  const aggregatedRecurring: AggregatedRecurringTransaction[] = recurringTransactions.map((rt) => {
    const isIncome = rt.type === 'income' || rt.type === 'INCOME'
    const type: 'income' | 'expense' = isIncome ? 'income' : 'expense'

    // Only count active recurring transactions for totals (Requirement 13.3)
    if (rt.isActive) {
      if (isIncome) {
        totalRecurringIncome += rt.amount
      } else {
        totalRecurringExpense += rt.amount
      }
    }

    const aggregatedItem: AggregatedRecurringTransaction = {
      id: rt.id,
      name: rt.name,
      description: rt.description,
      amount: rt.amount,
      type,
      frequency: rt.frequency,
      startDate: rt.startDate,
      nextDate: rt.nextPaymentDate,
      category: rt.category,
      isActive: rt.isActive,
      walletId: rt.wallet.id,
      walletName: rt.wallet.name,
      walletColor: rt.wallet.color || null,
    }

    // Update wallet summary
    const walletSummary = walletSummaryMap.get(rt.walletId)
    if (walletSummary) {
      walletSummary.items.push(aggregatedItem)
      walletSummary.itemCount++
      
      if (rt.isActive) {
        if (isIncome) {
          walletSummary.recurringIncome += rt.amount
        } else {
          walletSummary.recurringExpense += rt.amount
        }
      }
    }

    return aggregatedItem
  })

  // Get upcoming transactions (next 30 days) (Requirement 13.4)
  const now = new Date()
  const thirtyDaysFromNow = new Date()
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

  const upcomingTransactions = aggregatedRecurring.filter(
    (rt) => rt.isActive && rt.nextDate >= now && rt.nextDate <= thirtyDaysFromNow
  )

  return {
    recurring: aggregatedRecurring,
    totalRecurringIncome,
    totalRecurringExpense,
    upcomingTransactions,
    recurringByWallet: Array.from(walletSummaryMap.values()).filter(w => w.itemCount > 0),
  }
}



// ============ Helper Functions for Property Testing ============

/**
 * Verify all recurring transactions have wallet attribution
 * Used for property testing - Property 20
 */
export function verifyAllRecurringHaveWalletInfo(
  recurring: AggregatedRecurringTransaction[]
): boolean {
  return recurring.every(
    (rt) => rt.walletId && rt.walletId.length > 0 && rt.walletName && rt.walletName.length > 0
  )
}

/**
 * Verify total recurring income equals sum of active income items
 * Used for property testing - Property 20
 */
export function verifyTotalRecurringIncome(
  recurring: AggregatedRecurringTransaction[],
  totalRecurringIncome: number
): boolean {
  const calculatedIncome = recurring
    .filter((rt) => rt.isActive && rt.type === 'income')
    .reduce((sum, rt) => sum + rt.amount, 0)
  return Math.abs(totalRecurringIncome - calculatedIncome) < 0.01
}

/**
 * Verify total recurring expense equals sum of active expense items
 * Used for property testing - Property 20
 */
export function verifyTotalRecurringExpense(
  recurring: AggregatedRecurringTransaction[],
  totalRecurringExpense: number
): boolean {
  const calculatedExpense = recurring
    .filter((rt) => rt.isActive && rt.type === 'expense')
    .reduce((sum, rt) => sum + rt.amount, 0)
  return Math.abs(totalRecurringExpense - calculatedExpense) < 0.01
}

/**
 * Verify recurring count matches wallet summaries
 * Used for property testing - Property 20
 */
export function verifyRecurringCountMatchesWalletSummaries(
  recurring: AggregatedRecurringTransaction[],
  walletSummaries: WalletRecurringSummary[]
): boolean {
  // Count recurring per wallet
  const walletCounts = new Map<string, number>()
  for (const rt of recurring) {
    walletCounts.set(rt.walletId, (walletCounts.get(rt.walletId) || 0) + 1)
  }

  // Verify counts match summaries
  for (const summary of walletSummaries) {
    const expectedCount = walletCounts.get(summary.walletId) || 0
    if (summary.itemCount !== expectedCount) {
      return false
    }
  }

  return true
}

/**
 * Verify wallet summary income/expense totals
 * Used for property testing - Property 20
 */
export function verifyWalletSummaryTotals(
  walletSummary: WalletRecurringSummary
): boolean {
  const calculatedIncome = walletSummary.items
    .filter((rt) => rt.isActive && rt.type === 'income')
    .reduce((sum, rt) => sum + rt.amount, 0)
  const calculatedExpense = walletSummary.items
    .filter((rt) => rt.isActive && rt.type === 'expense')
    .reduce((sum, rt) => sum + rt.amount, 0)

  return (
    Math.abs(walletSummary.recurringIncome - calculatedIncome) < 0.01 &&
    Math.abs(walletSummary.recurringExpense - calculatedExpense) < 0.01
  )
}

/**
 * Verify all wallet summaries have correct totals
 * Used for property testing - Property 20
 */
export function verifyAllWalletSummaryTotals(
  walletSummaries: WalletRecurringSummary[]
): boolean {
  return walletSummaries.every(verifyWalletSummaryTotals)
}

/**
 * Verify upcoming transactions are within date range
 * Used for property testing - Property 20
 */
export function verifyUpcomingTransactionsInRange(
  upcomingTransactions: AggregatedRecurringTransaction[],
  startDate: Date,
  endDate: Date
): boolean {
  return upcomingTransactions.every((rt) => {
    const nextDate = new Date(rt.nextDate)
    return nextDate >= startDate && nextDate <= endDate
  })
}

/**
 * Verify upcoming transactions are all active
 * Used for property testing - Property 20
 */
export function verifyUpcomingTransactionsAreActive(
  upcomingTransactions: AggregatedRecurringTransaction[]
): boolean {
  return upcomingTransactions.every((rt) => rt.isActive)
}

/**
 * Calculate expected total recurring from wallet summaries
 * Used for property testing - Property 20
 */
export function calculateExpectedTotalRecurring(
  walletSummaries: WalletRecurringSummary[]
): number {
  return walletSummaries.reduce((sum, w) => sum + w.itemCount, 0)
}

/**
 * Verify all wallets from group are represented in summaries
 * Used for property testing - Property 20
 */
export function verifyAllWalletsRepresented(
  walletIds: string[],
  walletSummaries: WalletRecurringSummary[],
  recurring: AggregatedRecurringTransaction[]
): boolean {
  // Only wallets with recurring items should be in summaries
  const walletsWithRecurring = new Set(recurring.map((rt) => rt.walletId))
  const summaryWalletIds = new Set(walletSummaries.map((w) => w.walletId))
  
  // All wallets in summaries should have recurring items
  for (const walletId of summaryWalletIds) {
    if (!walletsWithRecurring.has(walletId)) {
      return false
    }
  }
  
  // All wallets with recurring items should be in summaries
  for (const walletId of walletsWithRecurring) {
    if (!summaryWalletIds.has(walletId)) {
      return false
    }
  }
  
  return true
}

/**
 * Verify type is either income or expense
 * Used for property testing - Property 20
 */
export function verifyValidTypes(
  recurring: AggregatedRecurringTransaction[]
): boolean {
  return recurring.every((rt) => rt.type === 'income' || rt.type === 'expense')
}
