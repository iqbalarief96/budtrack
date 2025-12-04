import prisma from '@/lib/prisma'
import {
  SavingRateData,
  SavingRateAnalysis,
  TrendDirection,
  TrendResult,
} from '@/app/types/goals-timeline'

/**
 * SavingRateService - Handles saving rate calculations and analysis
 * Requirements: 2.1, 2.2, 2.3
 */

/**
 * Calculate monthly saving rate from income and expenses
 * Property 1: Saving Rate Calculation
 * For any income and expense values, saving rate SHALL equal ((income - expenses) / income) * 100
 * with appropriate handling for zero income.
 * Validates: Requirements 2.1
 */
export function calculateSavingRate(income: number, expenses: number): number {
  if (income <= 0) {
    return 0
  }
  const savings = income - expenses
  const rate = (savings / income) * 100
  // Clamp to reasonable bounds (-100% to 100%)
  return Math.max(-100, Math.min(100, rate))
}

/**
 * Calculate the average of an array of rates
 * Property 2: Period Average Calculation
 * For any set of monthly saving rates, the N-month average SHALL equal the sum of rates divided by N.
 * Validates: Requirements 2.2
 */
export function calculateAverage(rates: number[]): number {
  if (rates.length === 0) {
    return 0
  }
  const sum = rates.reduce((acc, rate) => acc + rate, 0)
  return sum / rates.length
}

/**
 * Calculate trend direction based on first and last values
 * Property 3: Trend Detection
 * For any sequence of saving rates, trend SHALL be 'improving' if last > first by >10%,
 * 'declining' if last < first by >10%, otherwise 'stable'.
 * Validates: Requirements 2.3
 */
export function calculateTrend(rates: number[]): TrendResult {
  if (rates.length < 2) {
    return { direction: 'stable', percentage: 0 }
  }

  const first = rates[0]
  const last = rates[rates.length - 1]
  const change = last - first
  const percentageChange = first !== 0 ? (change / Math.abs(first)) * 100 : (change > 0 ? 100 : change < 0 ? -100 : 0)

  let direction: TrendDirection
  if (percentageChange > 10) {
    direction = 'improving'
  } else if (percentageChange < -10) {
    direction = 'declining'
  } else {
    direction = 'stable'
  }

  return { direction, percentage: percentageChange }
}

/**
 * Calculate consistency score (0-1) based on standard deviation
 * Higher consistency = lower variance in saving rates
 */
export function calculateConsistency(rates: number[]): number {
  if (rates.length < 2) {
    return 1 // Single value is perfectly consistent
  }

  const avg = calculateAverage(rates)
  const squaredDiffs = rates.map(rate => Math.pow(rate - avg, 2))
  const variance = squaredDiffs.reduce((acc, diff) => acc + diff, 0) / rates.length
  const stdDev = Math.sqrt(variance)

  // Normalize: lower stdDev = higher consistency
  // Using a sigmoid-like function to map stdDev to 0-1 range
  // stdDev of 0 = consistency of 1, stdDev of 20+ = consistency approaching 0
  const consistency = 1 / (1 + stdDev / 10)
  return Math.max(0, Math.min(1, consistency))
}

/**
 * Calculate monthly saving rate for a specific month
 */
export async function calculateMonthlySavingRate(
  userId: string,
  month: Date
): Promise<SavingRateData> {
  // Get start and end of month
  const startOfMonth = new Date(month.getFullYear(), month.getMonth(), 1)
  const endOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59, 999)

  // Get all transactions for the month
  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      date: {
        gte: startOfMonth,
        lte: endOfMonth,
      },
    },
    select: {
      amount: true,
      type: true,
    },
  })

  // Calculate income and expenses
  let income = 0
  let expenses = 0

  for (const tx of transactions) {
    const txType = tx.type.toLowerCase()
    if (txType === 'income') {
      income += tx.amount
    } else if (txType === 'expense') {
      expenses += tx.amount
    }
  }

  const savings = income - expenses
  const savingRate = calculateSavingRate(income, expenses)

  return {
    month: startOfMonth,
    income,
    expenses,
    savings,
    savingRate,
  }
}

/**
 * Get saving rate history for the last N months
 */
export async function getSavingRateHistory(
  userId: string,
  months: number
): Promise<SavingRateData[]> {
  const history: SavingRateData[] = []
  const now = new Date()

  for (let i = months - 1; i >= 0; i--) {
    const month = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const data = await calculateMonthlySavingRate(userId, month)
    history.push(data)
  }

  return history
}


/**
 * Analyze saving rate history and return comprehensive analysis
 * Requirements: 2.2, 2.3
 */
export function analyzeSavingRate(history: SavingRateData[]): SavingRateAnalysis {
  const rates = history.map(h => h.savingRate)
  
  // Current rate is the most recent
  const current = rates.length > 0 ? rates[rates.length - 1] : 0
  
  // Calculate period averages
  const last3Months = rates.slice(-3)
  const last6Months = rates.slice(-6)
  const last12Months = rates.slice(-12)
  
  const average3Month = calculateAverage(last3Months)
  const average6Month = calculateAverage(last6Months)
  const average12Month = calculateAverage(last12Months)
  
  // Calculate trend
  const trendResult = calculateTrend(rates)
  
  // Calculate consistency
  const consistency = calculateConsistency(rates)
  
  return {
    current,
    average3Month,
    average6Month,
    average12Month,
    trend: trendResult.direction,
    trendPercentage: trendResult.percentage,
    consistency,
  }
}

/**
 * Store saving rate data in history table
 */
export async function storeSavingRateHistory(
  userId: string,
  data: SavingRateData
): Promise<void> {
  // Using type assertion since Prisma client may not be regenerated yet
  await (prisma as any).savingRateHistory.upsert({
    where: {
      userId_month: {
        userId,
        month: data.month,
      },
    },
    update: {
      income: data.income,
      expenses: data.expenses,
      savings: data.savings,
      savingRate: data.savingRate,
    },
    create: {
      userId,
      month: data.month,
      income: data.income,
      expenses: data.expenses,
      savings: data.savings,
      savingRate: data.savingRate,
    },
  })
}

/**
 * Get stored saving rate history from database
 */
export async function getStoredSavingRateHistory(
  userId: string,
  months: number
): Promise<SavingRateData[]> {
  const now = new Date()
  const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1)
  
  // Using type assertion since Prisma client may not be regenerated yet
  const records = await (prisma as any).savingRateHistory.findMany({
    where: {
      userId,
      month: {
        gte: startDate,
      },
    },
    orderBy: {
      month: 'asc',
    },
  })
  
  return records.map((record: { month: Date; income: number; expenses: number; savings: number; savingRate: number }) => ({
    month: record.month,
    income: record.income,
    expenses: record.expenses,
    savings: record.savings,
    savingRate: record.savingRate,
  }))
}
