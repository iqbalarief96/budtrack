import prisma from '@/lib/prisma'
import { WalletGroupError, getGroupById } from './wallet-group-service'

// Types
export interface AggregatedTransaction {
  id: string
  amount: number
  description: string | null
  date: Date
  type: string
  categoryId: string | null
  category: {
    id: string
    name: string
    icon: string | null
    color: string | null
  } | null
  walletId: string
  walletName: string
  walletColor: string | null
}

export interface TransactionQueryOptions {
  startDate?: Date
  endDate?: Date
  type?: 'income' | 'expense'
  categoryId?: string
  limit?: number
  offset?: number
}

export interface DateRange {
  startDate?: Date
  endDate?: Date
}

export interface WalletBreakdown {
  walletId: string
  walletName: string
  balance: number
  income: number
  expense: number
  percentage: number
}

export interface AggregatedSummary {
  totalBalance: number
  totalIncome: number
  totalExpense: number
  walletBreakdown: WalletBreakdown[]
  currencyCode: string
}

/**
 * Get aggregated transactions from all wallets in a group
 * Requirements: 3.1, 3.2, 3.3, 3.4
 * 
 * - 3.1: Display all transactions from all Linked_Wallets sorted by date
 * - 3.2: Indicate which wallet each transaction belongs to
 * - 3.3: Apply filters across all Linked_Wallets
 * - 3.4: Automatically include new transactions (handled by querying live data)
 */
export async function getAggregatedTransactions(
  groupId: string,
  userId: string,
  options: TransactionQueryOptions = {}
): Promise<AggregatedTransaction[]> {
  // Verify group ownership and get group with wallets
  const group = await getGroupById(groupId, userId)
  
  if (!group) {
    throw new WalletGroupError('Wallet group not found', 'GROUP_NOT_FOUND')
  }

  // Get wallet IDs from the group
  const walletIds = group.wallets.map((member) => member.walletId)

  if (walletIds.length === 0) {
    return []
  }

  // Build where clause for filtering
  const whereClause: any = {
    walletId: { in: walletIds },
    userId,
  }

  // Apply date filters (Requirement 3.3)
  if (options.startDate || options.endDate) {
    whereClause.date = {}
    if (options.startDate) {
      whereClause.date.gte = options.startDate
    }
    if (options.endDate) {
      whereClause.date.lte = options.endDate
    }
  }

  // Apply type filter (Requirement 3.3) - support both uppercase and lowercase
  if (options.type) {
    whereClause.type = { in: [options.type, options.type.toUpperCase()] }
  }

  // Apply category filter (Requirement 3.3)
  if (options.categoryId) {
    whereClause.categoryId = options.categoryId
  }

  // Query transactions with sorting by date descending (Requirement 3.1)
  const transactions = await prisma.transaction.findMany({
    where: whereClause,
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
    // Only apply take if limit is a positive number
    ...(options.limit && options.limit > 0 ? { take: options.limit } : {}),
    ...(options.offset && options.offset > 0 ? { skip: options.offset } : {}),
  })

  // Transform to AggregatedTransaction format (Requirement 3.2 - include wallet info)
  return transactions.map((tx) => ({
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
  }))
}


/**
 * Get aggregated summary for a wallet group
 * Requirements: 4.1, 4.2, 4.3
 * 
 * - 4.1: Display the total combined balance of all Linked_Wallets
 * - 4.2: Show aggregated income and expense totals
 * - 4.3: Display a breakdown showing each Linked_Wallet's contribution to the total
 */
export async function getAggregatedSummary(
  groupId: string,
  userId: string,
  dateRange?: DateRange
): Promise<AggregatedSummary> {
  // Verify group ownership and get group with wallets
  const group = await getGroupById(groupId, userId)
  
  if (!group) {
    throw new WalletGroupError('Wallet group not found', 'GROUP_NOT_FOUND')
  }

  // Get wallet IDs from the group
  const walletIds = group.wallets.map((member) => member.walletId)

  if (walletIds.length === 0) {
    return {
      totalBalance: 0,
      totalIncome: 0,
      totalExpense: 0,
      walletBreakdown: [],
      currencyCode: 'IDR',
    }
  }

  // Build date filter for transactions
  const dateFilter: any = {}
  if (dateRange?.startDate || dateRange?.endDate) {
    dateFilter.date = {}
    if (dateRange.startDate) {
      dateFilter.date.gte = dateRange.startDate
    }
    if (dateRange.endDate) {
      dateFilter.date.lte = dateRange.endDate
    }
  }

  // Calculate totals for each wallet
  // Note: group.wallets already has calculated balances from getGroupById()
  const walletBreakdown: WalletBreakdown[] = []
  let totalBalance = 0
  let totalIncome = 0
  let totalExpense = 0

  for (const member of group.wallets) {
    const wallet = member.wallet
    // Use the calculated balance from getGroupById() which is real-time
    const walletBalance = wallet.balance

    // Get income for this wallet
    const incomeResult = await prisma.transaction.aggregate({
      where: {
        walletId: wallet.id,
        userId,
        type: { in: ['income', 'INCOME'] },
        ...dateFilter,
      },
      _sum: { amount: true },
    })

    // Get expense for this wallet
    const expenseResult = await prisma.transaction.aggregate({
      where: {
        walletId: wallet.id,
        userId,
        type: { in: ['expense', 'EXPENSE'] },
        ...dateFilter,
      },
      _sum: { amount: true },
    })

    const walletIncome = incomeResult._sum.amount || 0
    const walletExpense = expenseResult._sum.amount || 0

    walletBreakdown.push({
      walletId: wallet.id,
      walletName: wallet.name,
      balance: walletBalance,
      income: walletIncome,
      expense: walletExpense,
      percentage: 0, // Will be calculated after totals
    })

    totalBalance += walletBalance
    totalIncome += walletIncome
    totalExpense += walletExpense
  }

  // Calculate percentages (Requirement 4.3 - contribution to total)
  if (totalBalance !== 0) {
    for (const breakdown of walletBreakdown) {
      breakdown.percentage = (breakdown.balance / totalBalance) * 100
    }
  } else {
    // If total balance is 0, distribute equally or set to 0
    const equalPercentage = walletBreakdown.length > 0 ? 100 / walletBreakdown.length : 0
    for (const breakdown of walletBreakdown) {
      breakdown.percentage = equalPercentage
    }
  }

  return {
    totalBalance,
    totalIncome,
    totalExpense,
    walletBreakdown,
    currencyCode: 'IDR', // All wallets use IDR as per notes
  }
}

/**
 * Helper function to validate filter options
 * Used for property testing
 */
export function validateFilterOptions(options: TransactionQueryOptions): {
  valid: boolean
  error?: string
} {
  if (options.startDate && options.endDate) {
    if (options.startDate > options.endDate) {
      return { valid: false, error: 'Start date must be before end date' }
    }
  }

  if (options.type && !['income', 'expense'].includes(options.type)) {
    return { valid: false, error: 'Type must be income or expense' }
  }

  if (options.limit !== undefined && options.limit < 0) {
    return { valid: false, error: 'Limit must be non-negative' }
  }

  if (options.offset !== undefined && options.offset < 0) {
    return { valid: false, error: 'Offset must be non-negative' }
  }

  return { valid: true }
}

/**
 * Calculate expected aggregated balance from wallet balances
 * Used for property testing - Property 10
 */
export function calculateExpectedTotalBalance(walletBalances: number[]): number {
  return walletBalances.reduce((sum, balance) => sum + balance, 0)
}

/**
 * Calculate expected percentages from wallet balances
 * Used for property testing - Property 10
 */
export function calculateExpectedPercentages(walletBalances: number[]): number[] {
  const total = walletBalances.reduce((sum, balance) => sum + balance, 0)
  
  if (total === 0) {
    const equalPercentage = walletBalances.length > 0 ? 100 / walletBalances.length : 0
    return walletBalances.map(() => equalPercentage)
  }
  
  return walletBalances.map((balance) => (balance / total) * 100)
}

/**
 * Verify that percentages sum to 100 (or close to it due to floating point)
 * Used for property testing - Property 10
 */
export function verifyPercentagesSum(percentages: number[]): boolean {
  if (percentages.length === 0) return true
  const sum = percentages.reduce((acc, p) => acc + p, 0)
  // Allow small floating point tolerance
  return Math.abs(sum - 100) < 0.0001
}
