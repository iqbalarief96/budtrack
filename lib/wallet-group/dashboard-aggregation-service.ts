import prisma from '@/lib/prisma'
import { WalletGroupError, getGroupById } from './wallet-group-service'
import { DateRange, WalletBreakdown } from './aggregation-service'
import { calculateFinancialHealthScore } from '@/lib/financialHealthScore'

/**
 * DashboardAggregationService - Aggregates dashboard data across wallet groups
 * Requirements: 7.1, 7.2, 7.3, 7.4
 */

// Types
export interface CategorySpending {
  categoryId: string
  categoryName: string
  categoryIcon: string | null
  categoryColor: string | null
  amount: number
  percentage: number
  walletContributions: WalletContribution[]
}

export interface WalletContribution {
  walletId: string
  walletName: string
  amount: number
}

export interface IncomeExpenseComparison {
  totalIncome: number
  totalExpense: number
  netSavings: number
  savingsRate: number
}

export interface AggregatedDashboard {
  totalBalance: number
  totalIncome: number
  totalExpense: number
  spendingByCategory: CategorySpending[]
  incomeVsExpense: IncomeExpenseComparison
  financialHealthScore: number
  walletBreakdown: WalletBreakdown[]
}

/**
 * Get aggregated dashboard data for a wallet group
 * Requirements: 7.1, 7.2, 7.3, 7.4
 * 
 * - 7.1: Display aggregated spending charts from all Linked_Wallets
 * - 7.2: Display combined income vs expense comparison
 * - 7.3: Display top spending categories across all Linked_Wallets
 * - 7.4: Display financial health score based on combined data
 */
export async function getAggregatedDashboard(
  groupId: string,
  userId: string,
  dateRange?: DateRange
): Promise<AggregatedDashboard> {
  // Verify group ownership and get group with wallets
  const group = await getGroupById(groupId, userId)
  
  if (!group) {
    throw new WalletGroupError('Wallet group not found', 'GROUP_NOT_FOUND')
  }

  const walletIds = group.wallets.map((member) => member.walletId)

  if (walletIds.length === 0) {
    return {
      totalBalance: 0,
      totalIncome: 0,
      totalExpense: 0,
      spendingByCategory: [],
      incomeVsExpense: {
        totalIncome: 0,
        totalExpense: 0,
        netSavings: 0,
        savingsRate: 0,
      },
      financialHealthScore: 0,
      walletBreakdown: [],
    }
  }

  // Build date filter
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

  // Calculate totals and breakdown for each wallet
  // Note: group.wallets already has calculated balances from getGroupById()
  const walletBreakdown: WalletBreakdown[] = []
  let totalBalance = 0
  let totalIncome = 0
  let totalExpense = 0

  for (const member of group.wallets) {
    const wallet = member.wallet
    // Use the calculated balance from getGroupById() which is real-time
    const walletBalance = wallet.balance

    const [incomeResult, expenseResult] = await Promise.all([
      prisma.transaction.aggregate({
        where: {
          walletId: wallet.id,
          userId,
          type: { in: ['income', 'INCOME'] },
          ...dateFilter,
        },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: {
          walletId: wallet.id,
          userId,
          type: { in: ['expense', 'EXPENSE'] },
          ...dateFilter,
        },
        _sum: { amount: true },
      }),
    ])

    const walletIncome = incomeResult._sum.amount || 0
    const walletExpense = expenseResult._sum.amount || 0

    walletBreakdown.push({
      walletId: wallet.id,
      walletName: wallet.name,
      balance: walletBalance,
      income: walletIncome,
      expense: walletExpense,
      percentage: 0,
    })

    totalBalance += walletBalance
    totalIncome += walletIncome
    totalExpense += walletExpense
  }

  // Calculate percentages
  if (totalBalance !== 0) {
    for (const breakdown of walletBreakdown) {
      breakdown.percentage = (breakdown.balance / totalBalance) * 100
    }
  } else {
    const equalPercentage = walletBreakdown.length > 0 ? 100 / walletBreakdown.length : 0
    for (const breakdown of walletBreakdown) {
      breakdown.percentage = equalPercentage
    }
  }

  // Get spending by category (Requirement 7.1, 7.3)
  const spendingByCategory = await getSpendingByCategory(walletIds, userId, dateFilter)

  // Calculate income vs expense comparison (Requirement 7.2)
  const incomeVsExpense = calculateIncomeVsExpense(totalIncome, totalExpense)

  // Calculate financial health score (Requirement 7.4)
  // We calculate an average score across all wallets in the group
  const financialHealthScore = await calculateGroupFinancialHealthScore(walletIds, userId)

  return {
    totalBalance,
    totalIncome,
    totalExpense,
    spendingByCategory,
    incomeVsExpense,
    financialHealthScore,
    walletBreakdown,
  }
}


/**
 * Get spending by category across all wallets in a group
 * Requirements: 7.1, 7.3
 */
async function getSpendingByCategory(
  walletIds: string[],
  userId: string,
  dateFilter: any
): Promise<CategorySpending[]> {
  // Get all expense transactions grouped by category
  const transactions = await prisma.transaction.findMany({
    where: {
      walletId: { in: walletIds },
      userId,
      type: { in: ['expense', 'EXPENSE'] },
      categoryId: { not: null },
      ...dateFilter,
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
        },
      },
    },
  })

  // Group by category and calculate totals
  const categoryMap = new Map<string, {
    categoryId: string
    categoryName: string
    categoryIcon: string | null
    categoryColor: string | null
    amount: number
    walletContributions: Map<string, { walletId: string; walletName: string; amount: number }>
  }>()

  let totalSpending = 0

  for (const tx of transactions) {
    if (!tx.category) continue

    const categoryId = tx.category.id
    totalSpending += tx.amount

    if (!categoryMap.has(categoryId)) {
      categoryMap.set(categoryId, {
        categoryId,
        categoryName: tx.category.name,
        categoryIcon: tx.category.icon,
        categoryColor: tx.category.color,
        amount: 0,
        walletContributions: new Map(),
      })
    }

    const categoryData = categoryMap.get(categoryId)!
    categoryData.amount += tx.amount

    // Track wallet contributions
    const walletId = tx.wallet.id
    if (!categoryData.walletContributions.has(walletId)) {
      categoryData.walletContributions.set(walletId, {
        walletId,
        walletName: tx.wallet.name,
        amount: 0,
      })
    }
    categoryData.walletContributions.get(walletId)!.amount += tx.amount
  }

  // Convert to array and calculate percentages
  const result: CategorySpending[] = []
  for (const [, data] of categoryMap) {
    result.push({
      categoryId: data.categoryId,
      categoryName: data.categoryName,
      categoryIcon: data.categoryIcon,
      categoryColor: data.categoryColor,
      amount: data.amount,
      percentage: totalSpending > 0 ? (data.amount / totalSpending) * 100 : 0,
      walletContributions: Array.from(data.walletContributions.values()),
    })
  }

  // Sort by amount descending
  return result.sort((a, b) => b.amount - a.amount)
}

/**
 * Calculate income vs expense comparison
 * Requirements: 7.2
 */
export function calculateIncomeVsExpense(
  totalIncome: number,
  totalExpense: number
): IncomeExpenseComparison {
  const netSavings = totalIncome - totalExpense
  const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0

  return {
    totalIncome,
    totalExpense,
    netSavings,
    savingsRate,
  }
}

/**
 * Calculate financial health score for a wallet group
 * Requirements: 7.4
 * 
 * This calculates an aggregated financial health score by averaging
 * the scores across all wallets in the group.
 */
async function calculateGroupFinancialHealthScore(
  walletIds: string[],
  userId: string
): Promise<number> {
  if (walletIds.length === 0) {
    return 0
  }

  // Calculate financial health score for each wallet and average them
  let totalScore = 0
  let validScores = 0

  for (const walletId of walletIds) {
    try {
      const healthScore = await calculateFinancialHealthScore(userId, walletId)
      totalScore += healthScore.overallScore
      validScores++
    } catch {
      // Skip wallets that fail to calculate
      continue
    }
  }

  return validScores > 0 ? Math.round(totalScore / validScores) : 0
}

// ============ Helper Functions for Property Testing ============

/**
 * Calculate expected category spending totals
 * Used for property testing - Property 14
 */
export function calculateExpectedCategoryTotals(
  walletContributions: WalletContribution[][]
): number[] {
  return walletContributions.map((contributions) =>
    contributions.reduce((sum, c) => sum + c.amount, 0)
  )
}

/**
 * Verify that category totals equal sum of wallet contributions
 * Used for property testing - Property 14
 */
export function verifyCategoryTotalsMatchContributions(
  spendingByCategory: CategorySpending[]
): boolean {
  for (const category of spendingByCategory) {
    const contributionSum = category.walletContributions.reduce(
      (sum, c) => sum + c.amount,
      0
    )
    // Allow small floating point tolerance
    if (Math.abs(category.amount - contributionSum) > 0.01) {
      return false
    }
  }
  return true
}

/**
 * Verify that category percentages sum to 100% (or close to it)
 * Used for property testing - Property 14
 */
export function verifyCategoryPercentagesSum(
  spendingByCategory: CategorySpending[]
): boolean {
  if (spendingByCategory.length === 0) return true
  const sum = spendingByCategory.reduce((acc, c) => acc + c.percentage, 0)
  // Allow small floating point tolerance
  return Math.abs(sum - 100) < 0.01
}

/**
 * Verify savings rate calculation
 * Used for property testing
 */
export function verifySavingsRateCalculation(
  income: number,
  expense: number,
  savingsRate: number
): boolean {
  if (income <= 0) {
    return savingsRate === 0
  }
  const expectedRate = ((income - expense) / income) * 100
  return Math.abs(savingsRate - expectedRate) < 0.01
}
