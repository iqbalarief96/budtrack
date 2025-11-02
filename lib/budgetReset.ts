import { PrismaClient } from '@prisma/client'
import { getNextPeriodDates, hasBudgetEnded } from './budgetCalculations'

const prisma = new PrismaClient()

/**
 * Check and reset budgets that have ended their period
 * This should be run daily via a cron job or API endpoint
 */
export async function checkAndResetBudgets() {
  const now = new Date()

  // Find all budgets that have ended and are recurring
  const endedBudgets = await prisma.budget.findMany({
    where: {
      endDate: {
        lt: now,
      },
      isRecurring: true,
    },
    include: {
      category: true,
      wallet: true,
    },
  })

  console.log(`Found ${endedBudgets.length} ended recurring budgets to process`)

  const results = {
    snapshotsCreated: 0,
    budgetsReset: 0,
    errors: [] as string[],
  }

  for (const budget of endedBudgets) {
    try {
      // Create a history snapshot
      await prisma.budgetHistory.create({
        data: {
          budgetId: budget.id,
          amount: budget.amount,
          spent: budget.spent,
          periodStart: budget.startDate,
          periodEnd: budget.endDate,
        },
      })
      results.snapshotsCreated++

      // Calculate next period dates
      const { startDate: nextStart, endDate: nextEnd } = getNextPeriodDates(
        budget.startDate,
        budget.periodType
      )

      // Update budget with new period and reset spent
      await prisma.budget.update({
        where: { id: budget.id },
        data: {
          startDate: nextStart,
          endDate: nextEnd,
          spent: 0,
          lastResetDate: now,
        },
      })
      results.budgetsReset++

      console.log(
        `Reset budget ${budget.id} (${budget.category.name}) - New period: ${nextStart.toISOString()} to ${nextEnd.toISOString()}`
      )
    } catch (error) {
      console.error(`Error resetting budget ${budget.id}:`, error)
      results.errors.push(`Budget ${budget.id}: ${error}`)
    }
  }

  return results
}

/**
 * Reset a specific budget manually
 * Useful for user-triggered resets
 */
export async function resetBudget(budgetId: string, userId: string) {
  // Verify ownership
  const budget = await prisma.budget.findFirst({
    where: {
      id: budgetId,
      userId,
    },
  })

  if (!budget) {
    throw new Error('Budget not found or not authorized')
  }

  // Create history snapshot
  await prisma.budgetHistory.create({
    data: {
      budgetId: budget.id,
      amount: budget.amount,
      spent: budget.spent,
      periodStart: budget.startDate,
      periodEnd: budget.endDate,
    },
  })

  // Calculate next period dates
  const { startDate: nextStart, endDate: nextEnd } = getNextPeriodDates(
    budget.startDate,
    budget.periodType
  )

  // Update budget
  const updatedBudget = await prisma.budget.update({
    where: { id: budgetId },
    data: {
      startDate: nextStart,
      endDate: nextEnd,
      spent: 0,
      lastResetDate: new Date(),
    },
    include: {
      category: true,
      wallet: true,
    },
  })

  return updatedBudget
}

/**
 * Create a budget from the previous period's settings
 * Useful for "repeat last month's budget" feature
 */
export async function duplicateBudget(budgetId: string, userId: string) {
  // Verify ownership
  const originalBudget = await prisma.budget.findFirst({
    where: {
      id: budgetId,
      userId,
    },
  })

  if (!originalBudget) {
    throw new Error('Budget not found or not authorized')
  }

  // Calculate next period dates
  const { startDate: nextStart, endDate: nextEnd } = getNextPeriodDates(
    originalBudget.startDate,
    originalBudget.periodType
  )

  // Create new budget with same settings
  const newBudget = await prisma.budget.create({
    data: {
      amount: originalBudget.amount,
      spent: 0,
      startDate: nextStart,
      endDate: nextEnd,
      periodType: originalBudget.periodType,
      isRecurring: originalBudget.isRecurring,
      notificationThresholds: originalBudget.notificationThresholds,
      userId: originalBudget.userId,
      walletId: originalBudget.walletId,
      categoryId: originalBudget.categoryId,
    },
    include: {
      category: true,
      wallet: true,
    },
  })

  return newBudget
}

/**
 * Get budget history for analytics
 */
export async function getBudgetHistory(
  budgetId: string,
  userId: string,
  limit: number = 12
) {
  // Verify ownership
  const budget = await prisma.budget.findFirst({
    where: {
      id: budgetId,
      userId,
    },
  })

  if (!budget) {
    throw new Error('Budget not found or not authorized')
  }

  // Get history snapshots
  const history = await prisma.budgetHistory.findMany({
    where: {
      budgetId,
    },
    orderBy: {
      periodStart: 'desc',
    },
    take: limit,
  })

  return history
}

/**
 * Delete old history snapshots (cleanup)
 * Keep only last N months based on retention policy
 */
export async function cleanupOldHistory(retentionMonths: number = 12) {
  const cutoffDate = new Date()
  cutoffDate.setMonth(cutoffDate.getMonth() - retentionMonths)

  const result = await prisma.budgetHistory.deleteMany({
    where: {
      periodEnd: {
        lt: cutoffDate,
      },
    },
  })

  console.log(`Deleted ${result.count} old budget history records`)
  return result
}
