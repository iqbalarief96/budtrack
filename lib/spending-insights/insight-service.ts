import {
  SpendingInsight,
  InsightType,
  Severity,
  CreateInsightInput,
  SEVERITY_THRESHOLDS,
} from '@/app/types/spending-insights'

/**
 * InsightGeneratorService - Generates personalized spending insights
 * Requirements: 3.1, 3.2, 3.3, 3.4
 */

/**
 * Transaction interface for insight generation
 */
export interface TransactionForInsight {
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
 * Category spending data for insight generation
 */
export interface CategorySpendingData {
  categoryId: string
  categoryName: string
  currentAmount: number
  previousAmount: number
  currentTransactionCount: number
  previousTransactionCount: number
  lastTransactionDate: Date | null
}

/**
 * Weekend vs weekday spending data
 */
export interface WeekendWeekdayData {
  weekendAverage: number
  weekdayAverage: number
  weekendTotal: number
  weekdayTotal: number
  weekendCount: number
  weekdayCount: number
}

// ============ Insight Generation Thresholds ============

/**
 * Threshold for spending increase insight (>20%)
 * Validates: Requirements 3.1
 */
export const SPENDING_INCREASE_THRESHOLD = 0.20 // 20%

/**
 * Threshold for absence insight (2 weeks = 14 days)
 * Validates: Requirements 3.2
 */
export const ABSENCE_DAYS_THRESHOLD = 14 // 2 weeks

/**
 * Threshold for transaction size change insight (>25%)
 * Validates: Requirements 3.3
 */
export const TRANSACTION_SIZE_CHANGE_THRESHOLD = 0.25 // 25%

/**
 * Threshold for weekend pattern insight (>30% difference)
 * Validates: Requirements 3.4
 */
export const WEEKEND_PATTERN_THRESHOLD = 0.30 // 30%


// ============ Core Insight Detection Functions ============

/**
 * Detect if spending increase warrants an insight
 * Property 9: Spending Increase Insight Generation
 * For any category with spending increase, an insight SHALL be generated
 * if and only if increase > 20%.
 * Validates: Requirements 3.1
 *
 * @param currentAmount - Current period spending amount
 * @param previousAmount - Previous period spending amount
 * @param threshold - Threshold percentage (default: 0.20 for 20%)
 * @returns true if spending increase insight should be generated
 */
export function shouldGenerateSpendingIncreaseInsight(
  currentAmount: number,
  previousAmount: number,
  threshold: number = SPENDING_INCREASE_THRESHOLD
): boolean {
  // Handle edge cases
  if (previousAmount <= 0) {
    // If previous is 0 or negative, any positive current is an increase
    return currentAmount > 0
  }

  // Calculate percentage increase
  const percentageIncrease = (currentAmount - previousAmount) / previousAmount

  // Generate insight if increase > threshold (>20%)
  return percentageIncrease > threshold
}

/**
 * Calculate the percentage increase between two amounts
 * @param currentAmount - Current period spending amount
 * @param previousAmount - Previous period spending amount
 * @returns Percentage increase (0-100+ scale)
 */
export function calculatePercentageIncrease(
  currentAmount: number,
  previousAmount: number
): number {
  if (previousAmount <= 0) {
    return currentAmount > 0 ? 100 : 0
  }
  return ((currentAmount - previousAmount) / previousAmount) * 100
}

/**
 * Detect if absence warrants an insight
 * Validates: Requirements 3.2
 *
 * @param daysSinceLastSpend - Days since last transaction in category
 * @param threshold - Threshold in days (default: 14 for 2 weeks)
 * @returns true if absence insight should be generated
 */
export function shouldGenerateAbsenceInsight(
  daysSinceLastSpend: number,
  threshold: number = ABSENCE_DAYS_THRESHOLD
): boolean {
  return daysSinceLastSpend >= threshold
}

/**
 * Detect if transaction size change warrants an insight
 * Validates: Requirements 3.3
 *
 * @param currentAvgSize - Current average transaction size
 * @param previousAvgSize - Previous average transaction size
 * @param threshold - Threshold percentage (default: 0.25 for 25%)
 * @returns true if transaction size insight should be generated
 */
export function shouldGenerateTransactionSizeInsight(
  currentAvgSize: number,
  previousAvgSize: number,
  threshold: number = TRANSACTION_SIZE_CHANGE_THRESHOLD
): boolean {
  if (previousAvgSize <= 0) {
    return currentAvgSize > 0
  }

  const percentageChange = Math.abs(currentAvgSize - previousAvgSize) / previousAvgSize
  return percentageChange > threshold
}

/**
 * Detect if weekend pattern warrants an insight
 * Validates: Requirements 3.4
 *
 * @param weekendAvg - Weekend average spending
 * @param weekdayAvg - Weekday average spending
 * @param threshold - Threshold percentage (default: 0.30 for 30%)
 * @returns true if weekend pattern insight should be generated
 */
export function shouldGenerateWeekendPatternInsight(
  weekendAvg: number,
  weekdayAvg: number,
  threshold: number = WEEKEND_PATTERN_THRESHOLD
): boolean {
  // Need both values to be positive for meaningful comparison
  if (weekendAvg <= 0 && weekdayAvg <= 0) {
    return false
  }

  // Use the larger value as the base for comparison
  const baseValue = Math.max(weekendAvg, weekdayAvg)
  if (baseValue <= 0) {
    return false
  }

  const difference = Math.abs(weekendAvg - weekdayAvg)
  const percentageDifference = difference / baseValue

  return percentageDifference > threshold
}


// ============ Severity Calculation ============

/**
 * Calculate severity based on percentage change
 * Uses the same thresholds as anomaly detection for consistency
 *
 * @param percentageChange - Percentage change (0-100+ scale)
 * @returns Severity level
 */
export function calculateInsightSeverity(percentageChange: number): Severity {
  const absChange = Math.abs(percentageChange)

  if (absChange >= SEVERITY_THRESHOLDS.high.min) {
    return 'high'
  }
  if (absChange >= SEVERITY_THRESHOLDS.medium.min) {
    return 'medium'
  }
  return 'low'
}

// ============ Insight Generation Functions ============

/**
 * Generate unique ID for insight
 */
function generateInsightId(): string {
  return `insight-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
}

/**
 * Generate spending increase insight
 * Validates: Requirements 3.1
 *
 * @param categoryId - Category ID
 * @param categoryName - Category name
 * @param currentAmount - Current period spending
 * @param previousAmount - Previous period spending
 * @param userId - User ID
 * @returns SpendingInsight or null if threshold not met
 */
export function generateSpendingIncreaseInsight(
  categoryId: string,
  categoryName: string,
  currentAmount: number,
  previousAmount: number,
  userId: string
): SpendingInsight | null {
  if (!shouldGenerateSpendingIncreaseInsight(currentAmount, previousAmount)) {
    return null
  }

  const percentageIncrease = calculatePercentageIncrease(currentAmount, previousAmount)
  const severity = calculateInsightSeverity(percentageIncrease)

  return {
    id: generateInsightId(),
    userId,
    type: 'spending_increase',
    categoryId,
    title: `Spending Increase in ${categoryName}`,
    description: `Your spending in ${categoryName} increased by ${percentageIncrease.toFixed(1)}% compared to last month. Consider reviewing your expenses in this category.`,
    severity,
    data: {
      currentAmount,
      previousAmount,
      percentageIncrease,
      categoryName,
    },
    isRead: false,
    isDismissed: false,
    createdAt: new Date(),
  }
}

/**
 * Generate spending decrease insight
 * Validates: Requirements 3.1 (inverse case)
 *
 * @param categoryId - Category ID
 * @param categoryName - Category name
 * @param currentAmount - Current period spending
 * @param previousAmount - Previous period spending
 * @param userId - User ID
 * @returns SpendingInsight or null if threshold not met
 */
export function generateSpendingDecreaseInsight(
  categoryId: string,
  categoryName: string,
  currentAmount: number,
  previousAmount: number,
  userId: string
): SpendingInsight | null {
  if (previousAmount <= 0) {
    return null
  }

  const percentageDecrease = ((previousAmount - currentAmount) / previousAmount) * 100

  // Only generate if decrease is significant (>20%)
  if (percentageDecrease <= SPENDING_INCREASE_THRESHOLD * 100) {
    return null
  }

  const severity = calculateInsightSeverity(percentageDecrease)

  return {
    id: generateInsightId(),
    userId,
    type: 'spending_decrease',
    categoryId,
    title: `Spending Decrease in ${categoryName}`,
    description: `Great job! Your spending in ${categoryName} decreased by ${percentageDecrease.toFixed(1)}% compared to last month.`,
    severity,
    data: {
      currentAmount,
      previousAmount,
      percentageDecrease,
      categoryName,
    },
    isRead: false,
    isDismissed: false,
    createdAt: new Date(),
  }
}

/**
 * Generate absence insight
 * Validates: Requirements 3.2
 *
 * @param categoryId - Category ID
 * @param categoryName - Category name
 * @param daysSinceLastSpend - Days since last transaction
 * @param userId - User ID
 * @returns SpendingInsight or null if threshold not met
 */
export function generateAbsenceInsight(
  categoryId: string,
  categoryName: string,
  daysSinceLastSpend: number,
  userId: string
): SpendingInsight | null {
  if (!shouldGenerateAbsenceInsight(daysSinceLastSpend)) {
    return null
  }

  // Severity based on how long the absence is
  let severity: Severity = 'low'
  if (daysSinceLastSpend >= 30) {
    severity = 'medium'
  }
  if (daysSinceLastSpend >= 60) {
    severity = 'high'
  }

  const weeks = Math.floor(daysSinceLastSpend / 7)

  return {
    id: generateInsightId(),
    userId,
    type: 'absence',
    categoryId,
    title: `No Recent Spending in ${categoryName}`,
    description: `You haven't spent in ${categoryName} for ${weeks} week${weeks > 1 ? 's' : ''}. This might be intentional or you may have forgotten a regular expense.`,
    severity,
    data: {
      daysSinceLastSpend,
      weeks,
      categoryName,
    },
    isRead: false,
    isDismissed: false,
    createdAt: new Date(),
  }
}


/**
 * Generate transaction size change insight
 * Validates: Requirements 3.3
 *
 * @param categoryId - Category ID
 * @param categoryName - Category name
 * @param currentAvgSize - Current average transaction size
 * @param previousAvgSize - Previous average transaction size
 * @param userId - User ID
 * @returns SpendingInsight or null if threshold not met
 */
export function generateTransactionSizeInsight(
  categoryId: string,
  categoryName: string,
  currentAvgSize: number,
  previousAvgSize: number,
  userId: string
): SpendingInsight | null {
  if (!shouldGenerateTransactionSizeInsight(currentAvgSize, previousAvgSize)) {
    return null
  }

  const percentageChange = previousAvgSize > 0
    ? ((currentAvgSize - previousAvgSize) / previousAvgSize) * 100
    : 100

  const isIncrease = currentAvgSize > previousAvgSize
  const severity = calculateInsightSeverity(percentageChange)

  return {
    id: generateInsightId(),
    userId,
    type: 'transaction_size',
    categoryId,
    title: `Transaction Size ${isIncrease ? 'Increase' : 'Decrease'} in ${categoryName}`,
    description: `Your average transaction size in ${categoryName} has ${isIncrease ? 'increased' : 'decreased'} by ${Math.abs(percentageChange).toFixed(1)}%. ${isIncrease ? 'You might be making larger purchases.' : 'You might be making smaller, more frequent purchases.'}`,
    severity,
    data: {
      currentAvgSize,
      previousAvgSize,
      percentageChange,
      isIncrease,
      categoryName,
    },
    isRead: false,
    isDismissed: false,
    createdAt: new Date(),
  }
}

/**
 * Generate weekend pattern insight
 * Validates: Requirements 3.4
 *
 * @param weekendAvg - Weekend average spending
 * @param weekdayAvg - Weekday average spending
 * @param userId - User ID
 * @returns SpendingInsight or null if threshold not met
 */
export function generateWeekendPatternInsight(
  weekendAvg: number,
  weekdayAvg: number,
  userId: string
): SpendingInsight | null {
  if (!shouldGenerateWeekendPatternInsight(weekendAvg, weekdayAvg)) {
    return null
  }

  const baseValue = Math.max(weekendAvg, weekdayAvg)
  const difference = Math.abs(weekendAvg - weekdayAvg)
  const percentageDifference = (difference / baseValue) * 100

  const isWeekendHigher = weekendAvg > weekdayAvg
  const severity = calculateInsightSeverity(percentageDifference)

  return {
    id: generateInsightId(),
    userId,
    type: 'weekend_pattern',
    categoryId: null,
    title: isWeekendHigher ? 'Higher Weekend Spending' : 'Higher Weekday Spending',
    description: isWeekendHigher
      ? `Your weekend spending is ${percentageDifference.toFixed(1)}% higher than weekdays. Consider planning weekend activities with a budget in mind.`
      : `Your weekday spending is ${percentageDifference.toFixed(1)}% higher than weekends. This might be due to work-related expenses.`,
    severity,
    data: {
      weekendAvg,
      weekdayAvg,
      percentageDifference,
      isWeekendHigher,
    },
    isRead: false,
    isDismissed: false,
    createdAt: new Date(),
  }
}

// ============ Insight Management Functions ============

/**
 * Mark an insight as read
 * Validates: Requirements 5.3
 *
 * @param insight - The insight to mark as read
 * @returns Updated insight
 */
export function markInsightAsRead(insight: SpendingInsight): SpendingInsight {
  return {
    ...insight,
    isRead: true,
  }
}

/**
 * Dismiss an insight
 * Validates: Requirements 5.4
 *
 * @param insight - The insight to dismiss
 * @returns Updated insight
 */
export function dismissInsight(insight: SpendingInsight): SpendingInsight {
  return {
    ...insight,
    isDismissed: true,
  }
}

// ============ Utility Functions ============

/**
 * Calculate days since a given date
 *
 * @param lastDate - The last transaction date
 * @param referenceDate - Reference date (default: now)
 * @returns Number of days since last date
 */
export function calculateDaysSince(
  lastDate: Date | string | null,
  referenceDate: Date = new Date()
): number {
  if (!lastDate) {
    return Infinity
  }

  const last = new Date(lastDate)
  const diffTime = referenceDate.getTime() - last.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

  return Math.max(0, diffDays)
}

/**
 * Calculate weekend vs weekday spending from transactions
 *
 * @param transactions - Array of transactions
 * @returns WeekendWeekdayData
 */
export function calculateWeekendWeekdaySpending(
  transactions: TransactionForInsight[]
): WeekendWeekdayData {
  let weekendTotal = 0
  let weekdayTotal = 0
  let weekendCount = 0
  let weekdayCount = 0

  for (const tx of transactions) {
    const date = new Date(tx.date)
    const dayOfWeek = date.getDay()
    const amount = Math.abs(tx.amount)

    // Weekend: Saturday (6) and Sunday (0)
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      weekendTotal += amount
      weekendCount++
    } else {
      weekdayTotal += amount
      weekdayCount++
    }
  }

  return {
    weekendTotal,
    weekdayTotal,
    weekendCount,
    weekdayCount,
    weekendAverage: weekendCount > 0 ? weekendTotal / weekendCount : 0,
    weekdayAverage: weekdayCount > 0 ? weekdayTotal / weekdayCount : 0,
  }
}

/**
 * Filter insights to only show unread and not dismissed
 *
 * @param insights - Array of insights
 * @returns Filtered insights
 */
export function filterActiveInsights(insights: SpendingInsight[]): SpendingInsight[] {
  return insights.filter(insight => !insight.isDismissed)
}

/**
 * Sort insights by severity (high first) and then by date (newest first)
 *
 * @param insights - Array of insights
 * @returns Sorted insights
 */
export function sortInsightsBySeverity(insights: SpendingInsight[]): SpendingInsight[] {
  const severityOrder: Record<Severity, number> = {
    high: 0,
    medium: 1,
    low: 2,
  }

  return [...insights].sort((a, b) => {
    // First sort by severity
    const severityDiff = severityOrder[a.severity] - severityOrder[b.severity]
    if (severityDiff !== 0) {
      return severityDiff
    }

    // Then sort by date (newest first)
    const dateA = new Date(a.createdAt)
    const dateB = new Date(b.createdAt)
    return dateB.getTime() - dateA.getTime()
  })
}

/**
 * Get top N insights for dashboard widget
 * Validates: Requirements 5.2
 *
 * @param insights - Array of insights
 * @param limit - Maximum number of insights to return (default: 3)
 * @returns Top N insights sorted by severity
 */
export function getTopInsights(
  insights: SpendingInsight[],
  limit: number = 3
): SpendingInsight[] {
  const active = filterActiveInsights(insights)
  const sorted = sortInsightsBySeverity(active)
  return sorted.slice(0, limit)
}
