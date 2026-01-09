import prisma from '@/lib/prisma'
import { WalletGroupError, getGroupById } from './wallet-group-service'
import { AggregatedTransaction } from './aggregation-service'

/**
 * ReportAggregationService - Aggregates report data across wallet groups
 * Requirements: 10.1, 10.2, 10.3, 10.4
 */

// Types
export interface DateRange {
  startDate: Date
  endDate: Date
}

export interface ReportOptions {
  dateRange: DateRange
  includeCategories?: boolean
  includeWalletBreakdown?: boolean
}

export interface CategorySummary {
  categoryId: string
  categoryName: string
  categoryIcon: string | null
  categoryColor: string | null
  totalIncome: number
  totalExpense: number
  transactionCount: number
}

export interface WalletSummary {
  walletId: string
  walletName: string
  walletColor: string | null
  totalIncome: number
  totalExpense: number
  netAmount: number
  transactionCount: number
}

export interface AggregatedReport {
  dateRange: DateRange
  totalIncome: number
  totalExpense: number
  netSavings: number
  transactionsByCategory: CategorySummary[]
  transactionsByWallet: WalletSummary[]
  transactions: AggregatedTransaction[]
}

/**
 * Get aggregated report for a wallet group
 * Requirements: 10.1, 10.2, 10.3, 10.4
 * 
 * - 10.1: Include transactions from all Linked_Wallets
 * - 10.2: Show per-wallet breakdown within the report
 * - 10.3: Indicate which wallet each transaction belongs to
 * - 10.4: Support date range filtering for aggregated reports
 */
export async function getAggregatedReport(
  groupId: string,
  userId: string,
  options: ReportOptions
): Promise<AggregatedReport> {
  // Verify group ownership and get group with wallets
  const group = await getGroupById(groupId, userId)
  
  if (!group) {
    throw new WalletGroupError('Wallet group not found', 'GROUP_NOT_FOUND')
  }

  const walletIds = group.wallets.map((member) => member.walletId)

  if (walletIds.length === 0) {
    return {
      dateRange: options.dateRange,
      totalIncome: 0,
      totalExpense: 0,
      netSavings: 0,
      transactionsByCategory: [],
      transactionsByWallet: [],
      transactions: [],
    }
  }

  // Get all transactions within date range (Requirement 10.1, 10.4)
  const transactions = await prisma.transaction.findMany({
    where: {
      walletId: { in: walletIds },
      userId,
      date: {
        gte: options.dateRange.startDate,
        lte: options.dateRange.endDate,
      },
    },
    include: {
      category: {
        select: {
          id: true,
          name: true,
          icon: true,
          color: true,
        },
      },
      wallet: {
        select: {
          id: true,
          name: true,
          color: true,
        },
      },
    },
    orderBy: { date: 'desc' },
  })

  // Calculate totals
  let totalIncome = 0
  let totalExpense = 0

  // Build category summaries
  const categoryMap = new Map<string, CategorySummary>()
  
  // Build wallet summaries (Requirement 10.2)
  const walletMap = new Map<string, WalletSummary>()

  // Initialize wallet summaries for all wallets in group
  for (const member of group.wallets) {
    walletMap.set(member.walletId, {
      walletId: member.walletId,
      walletName: member.wallet.name,
      walletColor: member.wallet.color || null,
      totalIncome: 0,
      totalExpense: 0,
      netAmount: 0,
      transactionCount: 0,
    })
  }

  // Process transactions
  const aggregatedTransactions: AggregatedTransaction[] = []

  for (const tx of transactions) {
    const isIncome = tx.type === 'income' || tx.type === 'INCOME'
    const amount = tx.amount

    if (isIncome) {
      totalIncome += amount
    } else {
      totalExpense += amount
    }

    // Update category summary
    if (tx.category) {
      const categoryId = tx.category.id
      if (!categoryMap.has(categoryId)) {
        categoryMap.set(categoryId, {
          categoryId,
          categoryName: tx.category.name,
          categoryIcon: tx.category.icon,
          categoryColor: tx.category.color,
          totalIncome: 0,
          totalExpense: 0,
          transactionCount: 0,
        })
      }
      const categorySummary = categoryMap.get(categoryId)!
      if (isIncome) {
        categorySummary.totalIncome += amount
      } else {
        categorySummary.totalExpense += amount
      }
      categorySummary.transactionCount++
    }

    // Update wallet summary (Requirement 10.2)
    const walletSummary = walletMap.get(tx.walletId)
    if (walletSummary) {
      if (isIncome) {
        walletSummary.totalIncome += amount
      } else {
        walletSummary.totalExpense += amount
      }
      walletSummary.transactionCount++
    }

    // Add to aggregated transactions (Requirement 10.3 - include wallet info)
    aggregatedTransactions.push({
      id: tx.id,
      amount: tx.amount,
      description: tx.description,
      date: tx.date,
      type: tx.type,
      categoryId: tx.categoryId,
      category: tx.category,
      walletId: tx.wallet.id,
      walletName: tx.wallet.name,
      walletColor: tx.wallet.color,
    })
  }

  // Calculate net amounts for wallets
  for (const [, walletSummary] of walletMap) {
    walletSummary.netAmount = walletSummary.totalIncome - walletSummary.totalExpense
  }

  const netSavings = totalIncome - totalExpense

  return {
    dateRange: options.dateRange,
    totalIncome,
    totalExpense,
    netSavings,
    transactionsByCategory: Array.from(categoryMap.values()).sort(
      (a, b) => (b.totalIncome + b.totalExpense) - (a.totalIncome + a.totalExpense)
    ),
    transactionsByWallet: Array.from(walletMap.values()).sort(
      (a, b) => b.transactionCount - a.transactionCount
    ),
    transactions: aggregatedTransactions,
  }
}


// ============ Helper Functions for Property Testing ============

/**
 * Verify all transactions have wallet attribution
 * Used for property testing - Property 17
 */
export function verifyAllTransactionsHaveWalletInfo(
  transactions: AggregatedTransaction[]
): boolean {
  return transactions.every(
    (tx) => tx.walletId && tx.walletId.length > 0 && tx.walletName && tx.walletName.length > 0
  )
}

/**
 * Verify all transactions are within date range
 * Used for property testing - Property 17
 */
export function verifyTransactionsInDateRange(
  transactions: AggregatedTransaction[],
  dateRange: DateRange
): boolean {
  return transactions.every((tx) => {
    const txDate = new Date(tx.date)
    return txDate >= dateRange.startDate && txDate <= dateRange.endDate
  })
}

/**
 * Verify transaction count matches wallet summaries
 * Used for property testing - Property 17
 */
export function verifyTransactionCountMatchesWalletSummaries(
  transactions: AggregatedTransaction[],
  walletSummaries: WalletSummary[]
): boolean {
  // Count transactions per wallet
  const walletCounts = new Map<string, number>()
  for (const tx of transactions) {
    walletCounts.set(tx.walletId, (walletCounts.get(tx.walletId) || 0) + 1)
  }

  // Verify counts match summaries
  for (const summary of walletSummaries) {
    const expectedCount = walletCounts.get(summary.walletId) || 0
    if (summary.transactionCount !== expectedCount) {
      return false
    }
  }

  return true
}

/**
 * Verify total income equals sum of wallet incomes
 * Used for property testing - Property 17
 */
export function verifyTotalIncomeMatchesWalletSummaries(
  totalIncome: number,
  walletSummaries: WalletSummary[]
): boolean {
  const summedIncome = walletSummaries.reduce((sum, w) => sum + w.totalIncome, 0)
  return Math.abs(totalIncome - summedIncome) < 0.01
}

/**
 * Verify total expense equals sum of wallet expenses
 * Used for property testing - Property 17
 */
export function verifyTotalExpenseMatchesWalletSummaries(
  totalExpense: number,
  walletSummaries: WalletSummary[]
): boolean {
  const summedExpense = walletSummaries.reduce((sum, w) => sum + w.totalExpense, 0)
  return Math.abs(totalExpense - summedExpense) < 0.01
}

/**
 * Verify net savings calculation
 * Used for property testing - Property 17
 */
export function verifyNetSavingsCalculation(
  totalIncome: number,
  totalExpense: number,
  netSavings: number
): boolean {
  const expectedNetSavings = totalIncome - totalExpense
  return Math.abs(netSavings - expectedNetSavings) < 0.01
}

/**
 * Calculate expected total transactions from wallet summaries
 * Used for property testing - Property 17
 */
export function calculateExpectedTotalTransactions(
  walletSummaries: WalletSummary[]
): number {
  return walletSummaries.reduce((sum, w) => sum + w.transactionCount, 0)
}

/**
 * Verify all wallets from group are represented in summaries
 * Used for property testing - Property 17
 */
export function verifyAllWalletsRepresented(
  walletIds: string[],
  walletSummaries: WalletSummary[]
): boolean {
  const summaryWalletIds = new Set(walletSummaries.map((w) => w.walletId))
  return walletIds.every((id) => summaryWalletIds.has(id))
}
