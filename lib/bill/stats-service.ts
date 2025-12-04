import prisma from '@/lib/prisma'
import { BillStats, BillPayment } from '@/app/types/bill'

/**
 * Get bill statistics for a user
 */
export async function getBillStats(
  userId: string,
  months: number = 12
): Promise<BillStats> {
  const startDate = new Date()
  startDate.setMonth(startDate.getMonth() - months)

  // Get all bills for the user
  const bills = await prisma.bill.findMany({
    where: { userId },
    include: {
      category: {
        select: { id: true, name: true },
      },
      payments: {
        where: {
          paidDate: { gte: startDate },
        },
      },
    },
  })

  // Calculate totals
  const now = new Date()
  let totalMonthlyAmount = 0
  let upcomingTotal = 0
  let overdueTotal = 0
  let dueSoonTotal = 0

  const categoryTotals: Record<string, { amount: number; count: number; name: string }> = {}

  bills.forEach((bill) => {
    // Add to monthly total (for recurring bills, use the amount; for one-time, divide by months)
    if (bill.isRecurring) {
      totalMonthlyAmount += bill.amount
    }

    // Calculate status-based totals
    if (!bill.isPaid) {
      const dueDate = new Date(bill.dueDate)
      const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

      if (diffDays < 0) {
        overdueTotal += bill.amount
      } else if (diffDays <= 3) {
        dueSoonTotal += bill.amount
      } else if (diffDays <= 30) {
        upcomingTotal += bill.amount
      }
    }

    // Category breakdown
    const categoryId = bill.categoryId || 'uncategorized'
    const categoryName = bill.category?.name || 'Uncategorized'

    if (!categoryTotals[categoryId]) {
      categoryTotals[categoryId] = { amount: 0, count: 0, name: categoryName }
    }
    categoryTotals[categoryId].amount += bill.amount
    categoryTotals[categoryId].count++
  })

  // Calculate payment statistics
  const allPayments = bills.flatMap((b) => b.payments)
  const onTimePayments = allPayments.filter((p) => p.daysEarly >= 0)
  const paidOnTimePercentage =
    allPayments.length > 0 ? (onTimePayments.length / allPayments.length) * 100 : 100

  const averageDaysBeforeDue =
    allPayments.length > 0
      ? allPayments.reduce((sum, p) => sum + p.daysEarly, 0) / allPayments.length
      : 0

  // Format category breakdown
  const byCategory = Object.entries(categoryTotals).map(([categoryId, data]) => ({
    categoryId: categoryId === 'uncategorized' ? null : categoryId,
    categoryName: data.name,
    totalAmount: data.amount,
    count: data.count,
  }))

  return {
    totalMonthlyAmount,
    totalBillsCount: bills.length,
    paidOnTimePercentage: Math.round(paidOnTimePercentage * 10) / 10,
    averageDaysBeforeDue: Math.round(averageDaysBeforeDue * 10) / 10,
    upcomingTotal,
    overdueTotal,
    dueSoonTotal,
    byCategory: byCategory.sort((a, b) => b.totalAmount - a.totalAmount),
  }
}

/**
 * Get payment history for a specific bill
 */
export async function getPaymentHistory(
  billId: string,
  userId: string
): Promise<BillPayment[]> {
  // Verify ownership
  const bill = await prisma.bill.findFirst({
    where: { id: billId, userId },
  })

  if (!bill) {
    throw new Error('Bill not found')
  }

  const payments = await prisma.billPayment.findMany({
    where: { billId },
    orderBy: { paidDate: 'desc' },
  })

  return payments as BillPayment[]
}

/**
 * Calculate total amount for a list of bills
 */
export function calculateTotalAmount(bills: { amount: number }[]): number {
  return bills.reduce((sum, bill) => sum + bill.amount, 0)
}

/**
 * Calculate on-time payment percentage
 */
export function calculateOnTimePercentage(payments: { daysEarly: number }[]): number {
  if (payments.length === 0) return 100

  const onTimeCount = payments.filter((p) => p.daysEarly >= 0).length
  return (onTimeCount / payments.length) * 100
}

/**
 * Calculate average days early/late for payments
 */
export function calculateAverageDaysEarly(payments: { daysEarly: number }[]): number {
  if (payments.length === 0) return 0

  const totalDays = payments.reduce((sum, p) => sum + p.daysEarly, 0)
  return totalDays / payments.length
}

/**
 * Calculate category breakdown from bills
 */
export function calculateCategoryBreakdown(
  bills: Array<{
    amount: number
    categoryId: string | null
    category?: { id: string; name: string } | null
  }>
): Array<{
  categoryId: string | null
  categoryName: string
  totalAmount: number
  count: number
}> {
  const categoryTotals: Record<string, { amount: number; count: number; name: string }> = {}

  bills.forEach((bill) => {
    const categoryId = bill.categoryId || 'uncategorized'
    const categoryName = bill.category?.name || 'Uncategorized'

    if (!categoryTotals[categoryId]) {
      categoryTotals[categoryId] = { amount: 0, count: 0, name: categoryName }
    }
    categoryTotals[categoryId].amount += bill.amount
    categoryTotals[categoryId].count++
  })

  return Object.entries(categoryTotals).map(([categoryId, data]) => ({
    categoryId: categoryId === 'uncategorized' ? null : categoryId,
    categoryName: data.name,
    totalAmount: data.amount,
    count: data.count,
  }))
}

/**
 * Get bills summary for dashboard widget
 */
export async function getBillsSummary(userId: string): Promise<{
  totalDueThisWeek: number
  billsDueThisWeek: number
  overdueCount: number
  overdueAmount: number
}> {
  const now = new Date()
  const weekFromNow = new Date()
  weekFromNow.setDate(weekFromNow.getDate() + 7)

  const [dueThisWeek, overdue] = await Promise.all([
    prisma.bill.findMany({
      where: {
        userId,
        isPaid: false,
        dueDate: {
          gte: now,
          lte: weekFromNow,
        },
      },
    }),
    prisma.bill.findMany({
      where: {
        userId,
        isPaid: false,
        dueDate: { lt: now },
      },
    }),
  ])

  return {
    totalDueThisWeek: dueThisWeek.reduce((sum, b) => sum + b.amount, 0),
    billsDueThisWeek: dueThisWeek.length,
    overdueCount: overdue.length,
    overdueAmount: overdue.reduce((sum, b) => sum + b.amount, 0),
  }
}
