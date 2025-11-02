import { PrismaClient } from '@prisma/client'
import { calculateBudgetDetails, getBudgetStatus, shouldTriggerAlert } from './budgetCalculations'
import type { NotificationThresholds } from '@/app/types/budget'

const prisma = new PrismaClient()

/**
 * Check a specific budget for alerts and create notifications if needed
 */
export async function checkBudgetAlerts(budgetId: string) {
  const budget = await prisma.budget.findUnique({
    where: { id: budgetId },
    include: {
      category: true,
      wallet: true,
    },
  })

  if (!budget) {
    throw new Error('Budget not found')
  }

  // Calculate current spending
  const { spent, percentage } = await calculateBudgetDetails({
    id: budget.id,
    userId: budget.userId,
    walletId: budget.walletId,
    categoryId: budget.categoryId,
    amount: budget.amount,
    startDate: budget.startDate,
    endDate: budget.endDate,
  })

  // Parse notification thresholds
  const thresholds: NotificationThresholds = budget.notificationThresholds
    ? JSON.parse(budget.notificationThresholds)
    : { warning: 80, critical: 100 }

  // Get last alert for this budget
  const lastAlert = await prisma.budgetAlert.findFirst({
    where: { budgetId },
    orderBy: { createdAt: 'desc' },
  })

  // Calculate last alert percentage
  const lastAlertPercentage = lastAlert
    ? (lastAlert.currentSpent / budget.amount) * 100
    : null

  // Check if we should trigger an alert
  const { shouldAlert, alertType } = shouldTriggerAlert(
    percentage,
    lastAlertPercentage,
    thresholds
  )

  if (!shouldAlert || !alertType) {
    return null
  }

  // Create alert message
  let message = ''
  let threshold = 0

  switch (alertType) {
    case 'WARNING':
      threshold = thresholds.warning
      message = `Your budget for "${budget.category.name}" has reached ${percentage}% (${formatCurrency(spent)} of ${formatCurrency(budget.amount)})`
      break
    case 'CRITICAL':
      threshold = thresholds.critical
      message = `Your budget for "${budget.category.name}" has been fully used! ${formatCurrency(spent)} of ${formatCurrency(budget.amount)} spent.`
      break
    case 'EXCEEDED':
      threshold = 120
      message = `You've exceeded your budget for "${budget.category.name}" by ${percentage - 100}%! ${formatCurrency(spent)} of ${formatCurrency(budget.amount)} spent.`
      break
  }

  // Create budget alert
  const alert = await prisma.budgetAlert.create({
    data: {
      budgetId,
      userId: budget.userId,
      alertType,
      threshold,
      currentSpent: spent,
      message,
      isRead: false,
    },
  })

  console.log(`Created ${alertType} alert for budget ${budgetId}: ${message}`)

  return alert
}

/**
 * Check all active budgets for alerts
 * Should be called periodically (e.g., after transactions)
 */
export async function checkAllBudgetAlerts(userId?: string) {
  const where: any = {}
  if (userId) {
    where.userId = userId
  }

  // Get all budgets
  const budgets = await prisma.budget.findMany({
    where,
    include: {
      category: true,
      wallet: true,
    },
  })

  const results = {
    checked: 0,
    alertsCreated: 0,
    errors: [] as string[],
  }

  for (const budget of budgets) {
    try {
      results.checked++
      const alert = await checkBudgetAlerts(budget.id)
      if (alert) {
        results.alertsCreated++
      }
    } catch (error) {
      console.error(`Error checking alerts for budget ${budget.id}:`, error)
      results.errors.push(`Budget ${budget.id}: ${error}`)
    }
  }

  return results
}

/**
 * Get unread alerts for a user
 */
export async function getUnreadAlerts(userId: string) {
  const alerts = await prisma.budgetAlert.findMany({
    where: {
      userId,
      isRead: false,
    },
    include: {
      budget: {
        include: {
          category: true,
          wallet: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  return alerts
}

/**
 * Mark an alert as read
 */
export async function markAlertAsRead(alertId: string, userId: string) {
  // Verify ownership
  const alert = await prisma.budgetAlert.findFirst({
    where: {
      id: alertId,
      userId,
    },
  })

  if (!alert) {
    throw new Error('Alert not found or not authorized')
  }

  const updatedAlert = await prisma.budgetAlert.update({
    where: { id: alertId },
    data: { isRead: true },
  })

  return updatedAlert
}

/**
 * Mark all alerts as read for a user
 */
export async function markAllAlertsAsRead(userId: string) {
  const result = await prisma.budgetAlert.updateMany({
    where: {
      userId,
      isRead: false,
    },
    data: {
      isRead: true,
    },
  })

  return result
}

/**
 * Delete old read alerts (cleanup)
 */
export async function cleanupOldAlerts(daysToKeep: number = 30) {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

  const result = await prisma.budgetAlert.deleteMany({
    where: {
      isRead: true,
      createdAt: {
        lt: cutoffDate,
      },
    },
  })

  console.log(`Deleted ${result.count} old budget alerts`)
  return result
}

/**
 * Helper function to format currency
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount)
}
