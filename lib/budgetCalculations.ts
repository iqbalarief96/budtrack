import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export interface BudgetPeriod {
  start: Date
  end: Date
}

export interface BudgetSpending {
  spent: number
  percentage: number
  remaining: number
}

/**
 * Get the period dates for a budget based on its startDate and endDate
 * This replaces the old getCurrentPeriod() that always returned current month
 */
export function getBudgetPeriod(budget: {
  startDate: Date
  endDate: Date
}): BudgetPeriod {
  return {
    start: budget.startDate,
    end: budget.endDate,
  }
}

/**
 * Calculate the next period dates based on period type
 */
export function getNextPeriodDates(
  currentStart: Date,
  periodType: string
): { startDate: Date; endDate: Date } {
  const nextStart = new Date(currentStart)
  let nextEnd = new Date(currentStart)

  switch (periodType.toUpperCase()) {
    case 'DAILY':
      nextStart.setDate(nextStart.getDate() + 1)
      nextEnd.setDate(nextEnd.getDate() + 2)
      nextEnd.setSeconds(nextEnd.getSeconds() - 1) // End of day
      break
    case 'WEEKLY':
      nextStart.setDate(nextStart.getDate() + 7)
      nextEnd.setDate(nextEnd.getDate() + 14)
      nextEnd.setSeconds(nextEnd.getSeconds() - 1)
      break
    case 'MONTHLY':
      nextStart.setMonth(nextStart.getMonth() + 1)
      nextEnd.setMonth(nextEnd.getMonth() + 2)
      nextEnd.setDate(0) // Last day of month
      nextEnd.setHours(23, 59, 59, 999)
      break
    case 'QUARTERLY':
      nextStart.setMonth(nextStart.getMonth() + 3)
      nextEnd.setMonth(nextEnd.getMonth() + 6)
      nextEnd.setDate(0)
      nextEnd.setHours(23, 59, 59, 999)
      break
    case 'YEARLY':
      nextStart.setFullYear(nextStart.getFullYear() + 1)
      nextEnd.setFullYear(nextEnd.getFullYear() + 2)
      nextEnd.setDate(0)
      nextEnd.setHours(23, 59, 59, 999)
      break
    default: // Default to monthly
      nextStart.setMonth(nextStart.getMonth() + 1)
      nextEnd.setMonth(nextEnd.getMonth() + 2)
      nextEnd.setDate(0)
      nextEnd.setHours(23, 59, 59, 999)
  }

  return {
    startDate: nextStart,
    endDate: nextEnd,
  }
}

/**
 * Check if current date is within budget period
 */
export function isActiveBudget(budget: {
  startDate: Date
  endDate: Date
}): boolean {
  const now = new Date()
  return now >= budget.startDate && now <= budget.endDate
}

/**
 * Check if budget period has ended
 */
export function hasBudgetEnded(budget: { endDate: Date }): boolean {
  const now = new Date()
  return now > budget.endDate
}

/**
 * Calculate spending for a budget using ACTUAL budget period dates
 * This is the core fix - use budget's own dates, not current month
 */
export async function calculateBudgetSpending(
  userId: string,
  walletId: string,
  categoryId: string,
  startDate: Date,
  endDate: Date
): Promise<number> {
  const category = await prisma.category.findFirst({
    where: { id: categoryId, userId },
    select: { name: true },
  })

  const categoryIds = category
    ? (await prisma.category.findMany({
        where: { userId, name: category.name },
        select: { id: true },
      })).map(({ id }) => id)
    : [categoryId]

  const result = await prisma.transaction.aggregate({
    where: {
      userId,
      walletId,
      categoryId: { in: categoryIds },
      type: { in: ['expense', 'EXPENSE'] },
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    _sum: {
      amount: true,
    },
  })

  return result._sum.amount || 0
}

/**
 * Calculate budget with percentage and remaining
 */
export async function calculateBudgetDetails(budget: {
  id: string
  userId: string
  walletId: string
  categoryId: string
  amount: number
  startDate: Date
  endDate: Date
}): Promise<BudgetSpending> {
  const spent = await calculateBudgetSpending(
    budget.userId,
    budget.walletId,
    budget.categoryId,
    budget.startDate,
    budget.endDate
  )

  const percentage = Math.min(100, Math.round((spent / budget.amount) * 100))
  const remaining = budget.amount - spent

  return {
    spent,
    percentage,
    remaining,
  }
}

/**
 * Calculate daily burn rate
 */
export function calculateBurnRate(
  spent: number,
  startDate: Date,
  endDate: Date
): number {
  const now = new Date()
  const start = new Date(startDate)

  // Calculate days elapsed
  const daysElapsed = Math.max(
    1,
    Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  )

  return spent / daysElapsed
}

/**
 * Forecast when budget will be exceeded
 * Returns number of days until budget runs out
 */
export function forecastBudgetDepletion(
  amount: number,
  spent: number,
  burnRate: number
): number | null {
  if (burnRate <= 0) return null
  if (spent >= amount) return 0

  const remaining = amount - spent
  const daysUntilDepletion = Math.ceil(remaining / burnRate)

  return daysUntilDepletion
}

/**
 * Get budget status based on spending percentage
 */
export function getBudgetStatus(percentage: number): {
  status: 'safe' | 'warning' | 'critical' | 'exceeded'
  color: string
} {
  if (percentage < 80) {
    return { status: 'safe', color: 'green' }
  } else if (percentage < 100) {
    return { status: 'warning', color: 'yellow' }
  } else if (percentage < 120) {
    return { status: 'critical', color: 'red' }
  } else {
    return { status: 'exceeded', color: 'red' }
  }
}

/**
 * Check if budget needs alert based on thresholds
 */
export function shouldTriggerAlert(
  percentage: number,
  lastAlertPercentage: number | null,
  thresholds: { warning: number; critical: number }
): { shouldAlert: boolean; alertType: string | null } {
  // Warning threshold (default 80%)
  if (percentage >= thresholds.warning && percentage < thresholds.critical) {
    if (!lastAlertPercentage || lastAlertPercentage < thresholds.warning) {
      return { shouldAlert: true, alertType: 'WARNING' }
    }
  }

  // Critical threshold (default 100%)
  if (percentage >= thresholds.critical) {
    if (!lastAlertPercentage || lastAlertPercentage < thresholds.critical) {
      return { shouldAlert: true, alertType: 'CRITICAL' }
    }
  }

  // Exceeded threshold (120%)
  if (percentage >= 120) {
    if (!lastAlertPercentage || lastAlertPercentage < 120) {
      return { shouldAlert: true, alertType: 'EXCEEDED' }
    }
  }

  return { shouldAlert: false, alertType: null }
}
