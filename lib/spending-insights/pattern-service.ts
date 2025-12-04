import {
  SpendingPattern,
  MonthlySpending,
  DayOfWeekPattern,
  TrendResult,
  ComparisonResult,
  TrendDirection,
} from '@/app/types/spending-insights'

/**
 * PatternAnalysisService - Handles spending pattern analysis
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */

/**
 * Transaction interface for pattern analysis
 */
export interface TransactionForAnalysis {
  id: string
  amount: number
  date: Date | string
  categoryId: string | null
  category?: {
    id: string
    name: string
    icon: string | null
    color: string | null
  } | null
}

/**
 * Calculate average spending for a category over N months
 * Property 1: Category Average Calculation
 * For any set of transactions in a category over N months,
 * the average spending SHALL equal the sum of all transaction amounts divided by N.
 * Validates: Requirements 1.1
 */
export function calculateCategoryAverage(
  transactions: TransactionForAnalysis[],
  months: number
): number {
  if (months <= 0) {
    return 0
  }

  const totalAmount = transactions.reduce((sum, tx) => sum + Math.abs(tx.amount), 0)
  return totalAmount / months
}

/**
 * Calculate trend direction based on monthly spending data
 * Property 2: Trend Detection Accuracy
 * For any sequence of monthly spending values, trend detection SHALL correctly identify
 * increasing (last > first by >10%), decreasing (last < first by >10%), or stable patterns.
 * Validates: Requirements 1.2
 */
export function calculateTrend(monthlyData: MonthlySpending[]): TrendResult {
  if (monthlyData.length < 2) {
    return { direction: 'stable', percentage: 0 }
  }

  // Sort by month to ensure correct order
  const sorted = [...monthlyData].sort((a, b) => {
    const dateA = new Date(a.month)
    const dateB = new Date(b.month)
    return dateA.getTime() - dateB.getTime()
  })

  const firstAmount = sorted[0].amount
  const lastAmount = sorted[sorted.length - 1].amount

  // Handle edge case where first amount is 0
  if (firstAmount === 0) {
    if (lastAmount > 0) {
      return { direction: 'increasing', percentage: 100 }
    }
    return { direction: 'stable', percentage: 0 }
  }

  const percentageChange = ((lastAmount - firstAmount) / Math.abs(firstAmount)) * 100

  let direction: TrendDirection
  if (percentageChange > 10) {
    direction = 'increasing'
  } else if (percentageChange < -10) {
    direction = 'decreasing'
  } else {
    direction = 'stable'
  }

  return {
    direction,
    percentage: Math.abs(percentageChange),
  }
}

/**
 * Compare current month spending versus previous month
 * Property 3: Month-over-Month Comparison
 * For any two monthly totals, the percentage difference SHALL equal
 * ((current - previous) / |previous|) * 100.
 * Validates: Requirements 1.3
 */
export function compareMonths(current: number, previous: number): ComparisonResult {
  const difference = current - previous

  // Handle edge case where previous is 0
  if (previous === 0) {
    if (current > 0) {
      return { difference, percentageChange: 100 }
    }
    return { difference: 0, percentageChange: 0 }
  }

  const percentageChange = (difference / Math.abs(previous)) * 100

  return {
    difference,
    percentageChange,
  }
}


/**
 * Get top N spending categories sorted by total amount
 * Property 4: Top Categories Ordering
 * For any set of category totals, the top N categories SHALL be returned
 * in descending order by amount.
 * Validates: Requirements 1.4
 */
export function getTopCategories(
  patterns: SpendingPattern[],
  limit: number = 5
): SpendingPattern[] {
  if (limit <= 0) {
    return []
  }

  // Sort by average amount in descending order
  const sorted = [...patterns].sort((a, b) => b.averageAmount - a.averageAmount)

  // Return top N
  return sorted.slice(0, limit)
}

/**
 * Group transactions by category and calculate spending patterns
 */
export function groupTransactionsByCategory(
  transactions: TransactionForAnalysis[],
  months: number
): Map<string, TransactionForAnalysis[]> {
  const grouped = new Map<string, TransactionForAnalysis[]>()

  for (const tx of transactions) {
    const categoryId = tx.categoryId || 'uncategorized'
    const existing = grouped.get(categoryId) || []
    existing.push(tx)
    grouped.set(categoryId, existing)
  }

  return grouped
}

/**
 * Group transactions by month
 */
export function groupTransactionsByMonth(
  transactions: TransactionForAnalysis[]
): Map<string, TransactionForAnalysis[]> {
  const grouped = new Map<string, TransactionForAnalysis[]>()

  for (const tx of transactions) {
    const date = new Date(tx.date)
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const existing = grouped.get(monthKey) || []
    existing.push(tx)
    grouped.set(monthKey, existing)
  }

  return grouped
}

/**
 * Calculate monthly spending data from transactions
 */
export function calculateMonthlySpending(
  transactions: TransactionForAnalysis[]
): MonthlySpending[] {
  const byMonth = groupTransactionsByMonth(transactions)
  const result: MonthlySpending[] = []

  for (const [monthKey, txs] of byMonth) {
    const [year, month] = monthKey.split('-').map(Number)
    const totalAmount = txs.reduce((sum, tx) => sum + Math.abs(tx.amount), 0)

    result.push({
      month: new Date(year, month - 1, 1),
      amount: totalAmount,
      transactionCount: txs.length,
    })
  }

  // Sort by month
  return result.sort((a, b) => {
    const dateA = new Date(a.month)
    const dateB = new Date(b.month)
    return dateA.getTime() - dateB.getTime()
  })
}

/**
 * Calculate day-of-week spending patterns
 * Validates: Requirements 1.5
 */
export function calculateDayOfWeekPatterns(
  transactions: TransactionForAnalysis[]
): DayOfWeekPattern[] {
  // Group by day of week (0-6, Sunday-Saturday)
  const byDayOfWeek = new Map<number, TransactionForAnalysis[]>()

  for (const tx of transactions) {
    const date = new Date(tx.date)
    const dayOfWeek = date.getDay()
    const existing = byDayOfWeek.get(dayOfWeek) || []
    existing.push(tx)
    byDayOfWeek.set(dayOfWeek, existing)
  }

  const result: DayOfWeekPattern[] = []

  for (let day = 0; day < 7; day++) {
    const txs = byDayOfWeek.get(day) || []
    const totalAmount = txs.reduce((sum, tx) => sum + Math.abs(tx.amount), 0)
    const count = txs.length

    result.push({
      dayOfWeek: day,
      averageAmount: count > 0 ? totalAmount / count : 0,
      transactionCount: count,
    })
  }

  return result
}

/**
 * Build spending patterns for all categories
 */
export function buildSpendingPatterns(
  transactions: TransactionForAnalysis[],
  months: number,
  categoryMap: Map<string, { id: string; name: string; icon: string | null; color: string | null }>
): SpendingPattern[] {
  const byCategory = groupTransactionsByCategory(transactions, months)
  const patterns: SpendingPattern[] = []

  for (const [categoryId, txs] of byCategory) {
    const categoryInfo = categoryMap.get(categoryId) || {
      id: categoryId,
      name: 'Uncategorized',
      icon: null,
      color: null,
    }

    const monthlyData = calculateMonthlySpending(txs)
    const averageAmount = calculateCategoryAverage(txs, months)
    const trend = calculateTrend(monthlyData)

    patterns.push({
      categoryId: categoryInfo.id,
      categoryName: categoryInfo.name,
      averageAmount,
      trend: trend.direction,
      trendPercentage: trend.percentage,
      monthlyData,
    })
  }

  return patterns
}
