import prisma from '@/lib/prisma'
import { WalletGroupError, getGroupById } from './wallet-group-service'
import { DateRange } from './aggregation-service'

/**
 * BudgetAggregationService - Aggregates budget data across wallet groups
 * Requirements: 9.1, 9.2, 9.3, 9.4
 */

// Types
export interface WalletBudgetContribution {
  walletId: string
  walletName: string
  spent: number
}

export interface AggregatedBudget {
  budgetId: string
  categoryId: string
  categoryName: string
  categoryIcon: string | null
  categoryColor: string | null
  budgetAmount: number
  spentAmount: number
  remainingAmount: number
  percentage: number
  walletContributions: WalletBudgetContribution[]
}

export interface AggregatedBudgetSummary {
  budgets: AggregatedBudget[]
  totalBudgeted: number
  totalSpent: number
  totalRemaining: number
  overallUtilization: number
}

/**
 * Get aggregated budgets for a wallet group
 * Requirements: 9.1, 9.2, 9.3, 9.4
 * 
 * - 9.1: Display budget progress based on spending from all Linked_Wallets
 * - 9.2: Calculate budget utilization from combined transactions
 * - 9.3: Consider spending from all Linked_Wallets for budget alerts
 * - 9.4: Allow creating budgets that apply to a Wallet_Group scope
 */
export async function getAggregatedBudgets(
  groupId: string,
  userId: string,
  dateRange?: DateRange
): Promise<AggregatedBudgetSummary> {
  // Verify group ownership and get group with wallets
  const group = await getGroupById(groupId, userId)
  
  if (!group) {
    throw new WalletGroupError('Wallet group not found', 'GROUP_NOT_FOUND')
  }

  const walletIds = group.wallets.map((member) => member.walletId)

  if (walletIds.length === 0) {
    return {
      budgets: [],
      totalBudgeted: 0,
      totalSpent: 0,
      totalRemaining: 0,
      overallUtilization: 0,
    }
  }

  // Get budgets for wallets in the group. Without an explicit date range,
  // use currently-active budgets. With a date range, include budgets that
  // overlap that range so reports can inspect historical periods.
  const now = new Date()
  const budgetWhere = dateRange?.startDate || dateRange?.endDate
    ? {
        walletId: { in: walletIds },
        userId,
        ...(dateRange.startDate ? { endDate: { gte: dateRange.startDate } } : {}),
        ...(dateRange.endDate ? { startDate: { lte: dateRange.endDate } } : {}),
      }
    : {
        walletId: { in: walletIds },
        userId,
        startDate: { lte: now },
        endDate: { gte: now },
      }

  const budgets = await prisma.budget.findMany({
    where: budgetWhere,
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
    orderBy: [{ category: { name: 'asc' } }, { startDate: 'desc' }],
  })

  // Group budgets by category and keep every wallet budget period. This avoids
  // the old current-month shortcut and calculates spending from real
  // transactions inside each budget's actual start/end dates.
  const categoryBudgetMap = new Map<string, {
    categoryId: string
    categoryName: string
    categoryIcon: string | null
    categoryColor: string | null
    totalBudget: number
    budgetIds: string[]
    budgetPeriods: Array<{
      walletId: string
      walletName: string
      budgetAmount: number
      startDate: Date
      endDate: Date
    }>
  }>()

  for (const budget of budgets) {
    if (!budget.category) continue

    const categoryId = budget.category.id
    if (!categoryBudgetMap.has(categoryId)) {
      categoryBudgetMap.set(categoryId, {
        categoryId,
        categoryName: budget.category.name,
        categoryIcon: budget.category.icon,
        categoryColor: budget.category.color,
        totalBudget: 0,
        budgetIds: [],
        budgetPeriods: [],
      })
    }

    const categoryData = categoryBudgetMap.get(categoryId)!
    categoryData.totalBudget += budget.amount
    categoryData.budgetIds.push(budget.id)
    categoryData.budgetPeriods.push({
      walletId: budget.wallet.id,
      walletName: budget.wallet.name,
      budgetAmount: budget.amount,
      startDate: budget.startDate,
      endDate: budget.endDate,
    })
  }

  // Calculate spending for each budget period and aggregate by category/wallet.
  const aggregatedBudgets: AggregatedBudget[] = []
  let totalBudgeted = 0
  let totalSpent = 0

  for (const [categoryId, categoryData] of categoryBudgetMap) {
    const contributionMap = new Map<string, WalletBudgetContribution>()
    let categorySpent = 0

    for (const period of categoryData.budgetPeriods) {
      const effectiveStart = dateRange?.startDate && dateRange.startDate > period.startDate
        ? dateRange.startDate
        : period.startDate
      const effectiveEnd = dateRange?.endDate && dateRange.endDate < period.endDate
        ? dateRange.endDate
        : period.endDate

      const walletSpending = await prisma.transaction.aggregate({
        where: {
          walletId: period.walletId,
          userId,
          categoryId,
          type: { in: ['expense', 'EXPENSE'] },
          date: {
            gte: effectiveStart,
            lte: effectiveEnd,
          },
        },
        _sum: { amount: true },
      })

      const spent = walletSpending._sum.amount || 0
      categorySpent += spent

      const existing = contributionMap.get(period.walletId)
      if (existing) {
        existing.spent += spent
      } else {
        contributionMap.set(period.walletId, {
          walletId: period.walletId,
          walletName: period.walletName,
          spent,
        })
      }
    }

    const walletContributions = Array.from(contributionMap.values())
    const remainingAmount = categoryData.totalBudget - categorySpent
    const percentage = categoryData.totalBudget > 0 
      ? (categorySpent / categoryData.totalBudget) * 100 
      : 0

    aggregatedBudgets.push({
      budgetId: categoryData.budgetIds[0],
      categoryId,
      categoryName: categoryData.categoryName,
      categoryIcon: categoryData.categoryIcon,
      categoryColor: categoryData.categoryColor,
      budgetAmount: categoryData.totalBudget,
      spentAmount: categorySpent,
      remainingAmount,
      percentage,
      walletContributions,
    })

    totalBudgeted += categoryData.totalBudget
    totalSpent += categorySpent
  }

  const totalRemaining = totalBudgeted - totalSpent
  const overallUtilization = totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0

  // Sort by percentage (highest utilization first)
  aggregatedBudgets.sort((a, b) => b.percentage - a.percentage)

  return {
    budgets: aggregatedBudgets,
    totalBudgeted,
    totalSpent,
    totalRemaining,
    overallUtilization,
  }
}


// ============ Helper Functions for Property Testing ============

/**
 * Verify that spent amount equals sum of wallet contributions
 * Used for property testing - Property 16
 */
export function verifySpentEqualsContributions(
  budget: AggregatedBudget
): boolean {
  const contributionSum = budget.walletContributions.reduce(
    (sum, c) => sum + c.spent,
    0
  )
  // Allow small floating point tolerance
  return Math.abs(budget.spentAmount - contributionSum) < 0.01
}

/**
 * Verify all budgets have correct spent calculation
 * Used for property testing - Property 16
 */
export function verifyAllBudgetsSpentCorrect(
  budgets: AggregatedBudget[]
): boolean {
  return budgets.every(verifySpentEqualsContributions)
}

/**
 * Verify budget percentage calculation
 * Used for property testing - Property 16
 */
export function verifyBudgetPercentage(
  budgetAmount: number,
  spentAmount: number,
  percentage: number
): boolean {
  if (budgetAmount <= 0) {
    return percentage === 0
  }
  const expectedPercentage = (spentAmount / budgetAmount) * 100
  return Math.abs(percentage - expectedPercentage) < 0.01
}

/**
 * Verify remaining amount calculation
 * Used for property testing - Property 16
 */
export function verifyRemainingAmount(
  budgetAmount: number,
  spentAmount: number,
  remainingAmount: number
): boolean {
  const expectedRemaining = budgetAmount - spentAmount
  return Math.abs(remainingAmount - expectedRemaining) < 0.01
}

/**
 * Verify overall utilization calculation
 * Used for property testing - Property 16
 */
export function verifyOverallUtilization(
  totalBudgeted: number,
  totalSpent: number,
  overallUtilization: number
): boolean {
  if (totalBudgeted <= 0) {
    return overallUtilization === 0
  }
  const expectedUtilization = (totalSpent / totalBudgeted) * 100
  return Math.abs(overallUtilization - expectedUtilization) < 0.01
}

/**
 * Calculate expected total spent from budgets
 * Used for property testing - Property 16
 */
export function calculateExpectedTotalSpent(
  budgets: AggregatedBudget[]
): number {
  return budgets.reduce((sum, b) => sum + b.spentAmount, 0)
}

/**
 * Calculate expected total budgeted from budgets
 * Used for property testing - Property 16
 */
export function calculateExpectedTotalBudgeted(
  budgets: AggregatedBudget[]
): number {
  return budgets.reduce((sum, b) => sum + b.budgetAmount, 0)
}
