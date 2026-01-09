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

  // Get all active budgets for wallets in the group
  const now = new Date()
  const budgets = await prisma.budget.findMany({
    where: {
      walletId: { in: walletIds },
      userId,
      endDate: { gte: now },
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

  // Group budgets by category and aggregate
  const categoryBudgetMap = new Map<string, {
    categoryId: string
    categoryName: string
    categoryIcon: string | null
    categoryColor: string | null
    totalBudget: number
    budgetIds: string[]
    walletBudgets: Map<string, { walletId: string; walletName: string; budgetAmount: number }>
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
        walletBudgets: new Map(),
      })
    }

    const categoryData = categoryBudgetMap.get(categoryId)!
    categoryData.totalBudget += budget.amount
    categoryData.budgetIds.push(budget.id)
    categoryData.walletBudgets.set(budget.wallet.id, {
      walletId: budget.wallet.id,
      walletName: budget.wallet.name,
      budgetAmount: budget.amount,
    })
  }

  // Calculate spending for each category across all wallets
  const aggregatedBudgets: AggregatedBudget[] = []
  let totalBudgeted = 0
  let totalSpent = 0

  for (const [categoryId, categoryData] of categoryBudgetMap) {
    // Get spending for this category from all wallets in the group
    const walletContributions: WalletBudgetContribution[] = []
    let categorySpent = 0

    for (const member of group.wallets) {
      const walletSpending = await prisma.transaction.aggregate({
        where: {
          walletId: member.walletId,
          userId,
          categoryId,
          type: { in: ['expense', 'EXPENSE'] },
          date: dateRange ? {
            gte: dateRange.startDate,
            lte: dateRange.endDate,
          } : {
            gte: new Date(now.getFullYear(), now.getMonth(), 1), // Current month start
            lte: now,
          },
        },
        _sum: { amount: true },
      })

      const spent = walletSpending._sum.amount || 0
      categorySpent += spent

      walletContributions.push({
        walletId: member.walletId,
        walletName: member.wallet.name,
        spent,
      })
    }

    const remainingAmount = categoryData.totalBudget - categorySpent
    const percentage = categoryData.totalBudget > 0 
      ? (categorySpent / categoryData.totalBudget) * 100 
      : 0

    aggregatedBudgets.push({
      budgetId: categoryData.budgetIds[0], // Use first budget ID as reference
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
