import prisma from '@/lib/prisma'
import { WalletGroupError, getGroupById } from './wallet-group-service'
import { DateRange } from './aggregation-service'
import { detectSpendingAnomalies, SpendingAnomaly } from '@/lib/anomaly-detection'

/**
 * InsightsAggregationService - Aggregates spending insights across wallet groups
 * Requirements: 8.1, 8.2, 8.3, 8.4
 */

// Types
export interface SpendingPattern {
  categoryId: string
  categoryName: string
  averageAmount: number
  trend: 'increasing' | 'decreasing' | 'stable'
  trendPercentage: number
  monthlyData: MonthlySpending[]
}

export interface MonthlySpending {
  month: Date
  amount: number
  transactionCount: number
}

export interface SpendingTrend {
  period: string
  totalSpending: number
  changeFromPrevious: number
  changePercentage: number
}

export interface WalletSpendingComparison {
  walletId: string
  walletName: string
  totalSpending: number
  topCategories: CategorySpendingSummary[]
  percentageOfGroup: number
}

export interface CategorySpendingSummary {
  categoryId: string
  categoryName: string
  amount: number
  percentage: number
}

export interface AggregatedInsights {
  spendingPatterns: SpendingPattern[]
  anomalies: SpendingAnomaly[]
  trends: SpendingTrend[]
  walletComparison: WalletSpendingComparison[]
}

/**
 * Get aggregated insights for a wallet group
 * Requirements: 8.1, 8.2, 8.3, 8.4
 * 
 * - 8.1: Analyze spending patterns across all Linked_Wallets
 * - 8.2: Detect anomalies in combined spending data
 * - 8.3: Show spending trends aggregated from all Linked_Wallets
 * - 8.4: Provide insights comparing spending between Linked_Wallets
 */
export async function getAggregatedInsights(
  groupId: string,
  userId: string,
  dateRange?: DateRange
): Promise<AggregatedInsights> {
  // Verify group ownership and get group with wallets
  const group = await getGroupById(groupId, userId)
  
  if (!group) {
    throw new WalletGroupError('Wallet group not found', 'GROUP_NOT_FOUND')
  }

  const walletIds = group.wallets.map((member) => member.walletId)

  if (walletIds.length === 0) {
    return {
      spendingPatterns: [],
      anomalies: [],
      trends: [],
      walletComparison: [],
    }
  }

  // Get spending patterns (Requirement 8.1)
  const spendingPatterns = await getSpendingPatterns(walletIds, userId, dateRange)

  // Get anomalies (Requirement 8.2)
  const anomalies = await getAggregatedAnomalies(walletIds, userId)

  // Get trends (Requirement 8.3)
  const trends = await getSpendingTrends(walletIds, userId, dateRange)

  // Get wallet comparison (Requirement 8.4)
  const walletComparison = await getWalletComparison(group.wallets, userId, dateRange)

  return {
    spendingPatterns,
    anomalies,
    trends,
    walletComparison,
  }
}


/**
 * Get spending patterns across all wallets
 * Requirements: 8.1
 */
async function getSpendingPatterns(
  walletIds: string[],
  userId: string,
  dateRange?: DateRange
): Promise<SpendingPattern[]> {
  // Default to last 3 months if no date range
  const endDate = dateRange?.endDate || new Date()
  const startDate = dateRange?.startDate || new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000)

  // Get all expense transactions
  const transactions = await prisma.transaction.findMany({
    where: {
      walletId: { in: walletIds },
      userId,
      type: { in: ['expense', 'EXPENSE'] },
      categoryId: { not: null },
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      category: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { date: 'asc' },
  })

  // Group by category and calculate patterns
  const categoryMap = new Map<string, {
    categoryId: string
    categoryName: string
    transactions: { date: Date; amount: number }[]
  }>()

  for (const tx of transactions) {
    if (!tx.category) continue

    const categoryId = tx.category.id
    if (!categoryMap.has(categoryId)) {
      categoryMap.set(categoryId, {
        categoryId,
        categoryName: tx.category.name,
        transactions: [],
      })
    }

    categoryMap.get(categoryId)!.transactions.push({
      date: tx.date,
      amount: tx.amount,
    })
  }

  // Calculate patterns for each category
  const patterns: SpendingPattern[] = []
  const months = calculateMonthsBetween(startDate, endDate)

  for (const [, data] of categoryMap) {
    const monthlyData = calculateMonthlySpending(data.transactions, startDate, endDate)
    const averageAmount = calculateAverage(monthlyData.map((m) => m.amount))
    const { trend, trendPercentage } = calculateTrend(monthlyData)

    patterns.push({
      categoryId: data.categoryId,
      categoryName: data.categoryName,
      averageAmount,
      trend,
      trendPercentage,
      monthlyData,
    })
  }

  // Sort by average amount descending
  return patterns.sort((a, b) => b.averageAmount - a.averageAmount)
}

/**
 * Get aggregated anomalies from all wallets
 * Requirements: 8.2
 */
async function getAggregatedAnomalies(
  walletIds: string[],
  userId: string
): Promise<SpendingAnomaly[]> {
  const allAnomalies: SpendingAnomaly[] = []

  // Detect anomalies for each wallet
  for (const walletId of walletIds) {
    try {
      const walletAnomalies = await detectSpendingAnomalies(userId, walletId)
      allAnomalies.push(...walletAnomalies)
    } catch {
      // Skip wallets that fail
      continue
    }
  }

  // Sort by severity and percentage
  return allAnomalies.sort((a, b) => {
    const severityOrder = { high: 3, medium: 2, low: 1 }
    if (severityOrder[a.severity] !== severityOrder[b.severity]) {
      return severityOrder[b.severity] - severityOrder[a.severity]
    }
    return b.percentAboveAverage - a.percentAboveAverage
  })
}

/**
 * Get spending trends across all wallets
 * Requirements: 8.3
 */
async function getSpendingTrends(
  walletIds: string[],
  userId: string,
  dateRange?: DateRange
): Promise<SpendingTrend[]> {
  const endDate = dateRange?.endDate || new Date()
  const startDate = dateRange?.startDate || new Date(endDate.getTime() - 180 * 24 * 60 * 60 * 1000)

  // Get all expense transactions
  const transactions = await prisma.transaction.findMany({
    where: {
      walletId: { in: walletIds },
      userId,
      type: { in: ['expense', 'EXPENSE'] },
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      date: true,
      amount: true,
    },
    orderBy: { date: 'asc' },
  })

  // Group by month
  const monthlyTotals = new Map<string, number>()
  for (const tx of transactions) {
    const monthKey = `${tx.date.getFullYear()}-${String(tx.date.getMonth() + 1).padStart(2, '0')}`
    monthlyTotals.set(monthKey, (monthlyTotals.get(monthKey) || 0) + tx.amount)
  }

  // Convert to trends array
  const sortedMonths = Array.from(monthlyTotals.keys()).sort()
  const trends: SpendingTrend[] = []

  for (let i = 0; i < sortedMonths.length; i++) {
    const month = sortedMonths[i]
    const totalSpending = monthlyTotals.get(month) || 0
    const previousSpending = i > 0 ? monthlyTotals.get(sortedMonths[i - 1]) || 0 : 0
    const changeFromPrevious = totalSpending - previousSpending
    const changePercentage = previousSpending > 0 
      ? (changeFromPrevious / previousSpending) * 100 
      : (totalSpending > 0 ? 100 : 0)

    trends.push({
      period: month,
      totalSpending,
      changeFromPrevious,
      changePercentage,
    })
  }

  return trends
}

/**
 * Get wallet spending comparison
 * Requirements: 8.4
 */
async function getWalletComparison(
  walletMembers: { walletId: string; wallet: { id: string; name: string } }[],
  userId: string,
  dateRange?: DateRange
): Promise<WalletSpendingComparison[]> {
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

  const comparisons: WalletSpendingComparison[] = []
  let totalGroupSpending = 0

  // Calculate spending for each wallet
  for (const member of walletMembers) {
    const transactions = await prisma.transaction.findMany({
      where: {
        walletId: member.walletId,
        userId,
        type: { in: ['expense', 'EXPENSE'] },
        ...dateFilter,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    const totalSpending = transactions.reduce((sum, tx) => sum + tx.amount, 0)
    totalGroupSpending += totalSpending

    // Calculate top categories
    const categoryTotals = new Map<string, { id: string; name: string; amount: number }>()
    for (const tx of transactions) {
      if (!tx.category) continue
      const existing = categoryTotals.get(tx.category.id) || {
        id: tx.category.id,
        name: tx.category.name,
        amount: 0,
      }
      existing.amount += tx.amount
      categoryTotals.set(tx.category.id, existing)
    }

    const topCategories: CategorySpendingSummary[] = Array.from(categoryTotals.values())
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)
      .map((cat) => ({
        categoryId: cat.id,
        categoryName: cat.name,
        amount: cat.amount,
        percentage: totalSpending > 0 ? (cat.amount / totalSpending) * 100 : 0,
      }))

    comparisons.push({
      walletId: member.walletId,
      walletName: member.wallet.name,
      totalSpending,
      topCategories,
      percentageOfGroup: 0, // Will be calculated after
    })
  }

  // Calculate percentage of group
  for (const comparison of comparisons) {
    comparison.percentageOfGroup = totalGroupSpending > 0
      ? (comparison.totalSpending / totalGroupSpending) * 100
      : (comparisons.length > 0 ? 100 / comparisons.length : 0)
  }

  // Sort by total spending descending
  return comparisons.sort((a, b) => b.totalSpending - a.totalSpending)
}


// ============ Helper Functions ============

/**
 * Calculate months between two dates
 */
function calculateMonthsBetween(startDate: Date, endDate: Date): number {
  const start = new Date(startDate)
  const end = new Date(endDate)
  return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1
}

/**
 * Calculate monthly spending from transactions
 */
function calculateMonthlySpending(
  transactions: { date: Date; amount: number }[],
  startDate: Date,
  endDate: Date
): MonthlySpending[] {
  const monthlyMap = new Map<string, { amount: number; count: number }>()

  // Initialize all months in range
  const current = new Date(startDate)
  while (current <= endDate) {
    const key = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`
    monthlyMap.set(key, { amount: 0, count: 0 })
    current.setMonth(current.getMonth() + 1)
  }

  // Aggregate transactions
  for (const tx of transactions) {
    const key = `${tx.date.getFullYear()}-${String(tx.date.getMonth() + 1).padStart(2, '0')}`
    const existing = monthlyMap.get(key) || { amount: 0, count: 0 }
    existing.amount += tx.amount
    existing.count++
    monthlyMap.set(key, existing)
  }

  // Convert to array
  return Array.from(monthlyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, data]) => {
      const [year, month] = key.split('-').map(Number)
      return {
        month: new Date(year, month - 1, 1),
        amount: data.amount,
        transactionCount: data.count,
      }
    })
}

/**
 * Calculate average of numbers
 */
function calculateAverage(numbers: number[]): number {
  if (numbers.length === 0) return 0
  return numbers.reduce((sum, n) => sum + n, 0) / numbers.length
}

/**
 * Calculate trend from monthly data
 */
function calculateTrend(monthlyData: MonthlySpending[]): {
  trend: 'increasing' | 'decreasing' | 'stable'
  trendPercentage: number
} {
  if (monthlyData.length < 2) {
    return { trend: 'stable', trendPercentage: 0 }
  }

  const firstAmount = monthlyData[0].amount
  const lastAmount = monthlyData[monthlyData.length - 1].amount

  if (firstAmount === 0) {
    if (lastAmount > 0) {
      return { trend: 'increasing', trendPercentage: 100 }
    }
    return { trend: 'stable', trendPercentage: 0 }
  }

  const percentageChange = ((lastAmount - firstAmount) / firstAmount) * 100

  let trend: 'increasing' | 'decreasing' | 'stable'
  if (percentageChange > 10) {
    trend = 'increasing'
  } else if (percentageChange < -10) {
    trend = 'decreasing'
  } else {
    trend = 'stable'
  }

  return { trend, trendPercentage: Math.abs(percentageChange) }
}

// ============ Helper Functions for Property Testing ============

/**
 * Verify wallet comparison percentages sum to 100%
 * Used for property testing - Property 15
 */
export function verifyWalletComparisonPercentagesSum(
  walletComparison: WalletSpendingComparison[]
): boolean {
  if (walletComparison.length === 0) return true
  const sum = walletComparison.reduce((acc, w) => acc + w.percentageOfGroup, 0)
  // Allow small floating point tolerance
  return Math.abs(sum - 100) < 0.01
}

/**
 * Verify all wallets are included in comparison
 * Used for property testing - Property 15
 */
export function verifyAllWalletsIncluded(
  walletIds: string[],
  walletComparison: WalletSpendingComparison[]
): boolean {
  const comparisonWalletIds = new Set(walletComparison.map((w) => w.walletId))
  return walletIds.every((id) => comparisonWalletIds.has(id))
}

/**
 * Calculate expected total spending from wallet comparisons
 * Used for property testing - Property 15
 */
export function calculateExpectedTotalSpending(
  walletComparison: WalletSpendingComparison[]
): number {
  return walletComparison.reduce((sum, w) => sum + w.totalSpending, 0)
}

/**
 * Verify spending patterns include data from all wallets
 * Used for property testing - Property 15
 */
export function verifyPatternsIncludeAllWallets(
  patterns: SpendingPattern[],
  expectedCategories: string[]
): boolean {
  const patternCategories = new Set(patterns.map((p) => p.categoryId))
  return expectedCategories.every((cat) => patternCategories.has(cat))
}
