import prisma from '@/lib/prisma'
import {
  Bill,
  BillInput,
  BillStatus,
  BillFilters,
  BillFrequency,
  DEFAULT_REMINDER_DAYS,
} from '@/app/types/bill'

/**
 * Calculate the status of a bill based on its due date and payment status
 */
export function calculateBillStatus(bill: { dueDate: Date | string; isPaid: boolean }): BillStatus {
  if (bill.isPaid) {
    return 'PAID'
  }

  const now = new Date()
  const dueDate = new Date(bill.dueDate)
  const diffTime = dueDate.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    return 'OVERDUE'
  } else if (diffDays <= 3) {
    return 'DUE_SOON'
  } else {
    return 'UPCOMING'
  }
}

/**
 * Calculate the next due date based on frequency
 */
export function calculateNextDueDate(currentDueDate: Date | string, frequency: BillFrequency): Date {
  const next = new Date(currentDueDate)

  switch (frequency) {
    case 'DAILY':
      next.setDate(next.getDate() + 1)
      break
    case 'WEEKLY':
      next.setDate(next.getDate() + 7)
      break
    case 'BIWEEKLY':
      next.setDate(next.getDate() + 14)
      break
    case 'MONTHLY':
      next.setMonth(next.getMonth() + 1)
      break
    case 'QUARTERLY':
      next.setMonth(next.getMonth() + 3)
      break
    case 'YEARLY':
      next.setFullYear(next.getFullYear() + 1)
      break
    default:
      next.setMonth(next.getMonth() + 1)
  }

  return next
}

/**
 * Parse reminder days from JSON string
 */
function parseReminderDays(reminderDays: string): number[] {
  try {
    return JSON.parse(reminderDays)
  } catch {
    return DEFAULT_REMINDER_DAYS
  }
}

/**
 * Transform database bill to Bill type with computed status
 */
function transformBill(dbBill: any): Bill {
  const reminderDays = parseReminderDays(dbBill.reminderDays)
  const status = calculateBillStatus(dbBill)

  return {
    ...dbBill,
    reminderDays,
    status,
  }
}

/**
 * Create a new bill
 */
export async function createBill(userId: string, input: BillInput): Promise<Bill> {
  const reminderDays = input.reminderDays || DEFAULT_REMINDER_DAYS

  const bill = await prisma.bill.create({
    data: {
      userId,
      name: input.name,
      amount: input.amount,
      dueDate: new Date(input.dueDate),
      categoryId: input.categoryId || null,
      walletId: input.walletId,
      recurringTransactionId: input.recurringTransactionId || null,
      reminderDays: JSON.stringify(reminderDays),
      notes: input.notes || null,
      isRecurring: input.isRecurring || false,
      frequency: input.frequency || null,
    },
    include: {
      category: {
        select: { id: true, name: true, icon: true, color: true },
      },
      wallet: {
        select: { id: true, name: true },
      },
      recurringTransaction: {
        select: { id: true, name: true, frequency: true },
      },
    },
  })

  return transformBill(bill)
}

/**
 * Update an existing bill
 */
export async function updateBill(
  billId: string,
  userId: string,
  input: Partial<BillInput>
): Promise<Bill> {
  // Verify ownership
  const existing = await prisma.bill.findFirst({
    where: { id: billId, userId },
  })

  if (!existing) {
    throw new Error('Bill not found')
  }

  const updateData: any = {}

  if (input.name !== undefined) updateData.name = input.name
  if (input.amount !== undefined) updateData.amount = input.amount
  if (input.dueDate !== undefined) updateData.dueDate = new Date(input.dueDate)
  if (input.categoryId !== undefined) updateData.categoryId = input.categoryId || null
  if (input.walletId !== undefined) updateData.walletId = input.walletId
  if (input.recurringTransactionId !== undefined) {
    updateData.recurringTransactionId = input.recurringTransactionId || null
  }
  if (input.reminderDays !== undefined) {
    updateData.reminderDays = JSON.stringify(input.reminderDays)
  }
  if (input.notes !== undefined) updateData.notes = input.notes || null
  if (input.isRecurring !== undefined) updateData.isRecurring = input.isRecurring
  if (input.frequency !== undefined) updateData.frequency = input.frequency || null

  const bill = await prisma.bill.update({
    where: { id: billId },
    data: updateData,
    include: {
      category: {
        select: { id: true, name: true, icon: true, color: true },
      },
      wallet: {
        select: { id: true, name: true },
      },
      recurringTransaction: {
        select: { id: true, name: true, frequency: true },
      },
    },
  })

  return transformBill(bill)
}

/**
 * Delete a bill
 */
export async function deleteBill(billId: string, userId: string): Promise<void> {
  const existing = await prisma.bill.findFirst({
    where: { id: billId, userId },
  })

  if (!existing) {
    throw new Error('Bill not found')
  }

  await prisma.bill.delete({
    where: { id: billId },
  })
}

/**
 * Get a single bill by ID
 */
export async function getBill(billId: string, userId: string): Promise<Bill | null> {
  const bill = await prisma.bill.findFirst({
    where: { id: billId, userId },
    include: {
      category: {
        select: { id: true, name: true, icon: true, color: true },
      },
      wallet: {
        select: { id: true, name: true },
      },
      recurringTransaction: {
        select: { id: true, name: true, frequency: true },
      },
    },
  })

  if (!bill) return null

  return transformBill(bill)
}

/**
 * Get all bills for a user with optional filters
 */
export async function getBills(userId: string, filters?: BillFilters): Promise<Bill[]> {
  const where: any = { userId }

  if (filters?.categoryId) {
    where.categoryId = filters.categoryId
  }

  if (filters?.walletId) {
    where.walletId = filters.walletId
  }

  if (filters?.isPaid !== undefined) {
    where.isPaid = filters.isPaid
  }

  if (filters?.dueDateFrom || filters?.dueDateTo) {
    where.dueDate = {}
    if (filters.dueDateFrom) {
      where.dueDate.gte = new Date(filters.dueDateFrom)
    }
    if (filters.dueDateTo) {
      where.dueDate.lte = new Date(filters.dueDateTo)
    }
  }

  if (filters?.search) {
    where.name = { contains: filters.search }
  }

  const bills = await prisma.bill.findMany({
    where,
    include: {
      category: {
        select: { id: true, name: true, icon: true, color: true },
      },
      wallet: {
        select: { id: true, name: true },
      },
      recurringTransaction: {
        select: { id: true, name: true, frequency: true },
      },
    },
    orderBy: { dueDate: 'asc' },
  })

  let transformedBills = bills.map(transformBill)

  // Filter by status if specified (computed field, so filter after transform)
  if (filters?.status) {
    const statusArray = Array.isArray(filters.status) ? filters.status : [filters.status]
    transformedBills = transformedBills.filter((bill) => statusArray.includes(bill.status!))
  }

  return transformedBills
}

/**
 * Mark a bill as paid
 */
export async function markBillAsPaid(
  billId: string,
  userId: string,
  paidDate?: Date
): Promise<Bill> {
  const bill = await prisma.bill.findFirst({
    where: { id: billId, userId },
  })

  if (!bill) {
    throw new Error('Bill not found')
  }

  const actualPaidDate = paidDate || new Date()
  const dueDate = new Date(bill.dueDate)
  const daysEarly = Math.ceil((dueDate.getTime() - actualPaidDate.getTime()) / (1000 * 60 * 60 * 24))

  // Create payment record
  await prisma.billPayment.create({
    data: {
      billId,
      amount: bill.amount,
      paidDate: actualPaidDate,
      dueDate: bill.dueDate,
      daysEarly,
    },
  })

  // Update bill
  const updateData: any = {
    isPaid: true,
    paidDate: actualPaidDate,
  }

  // If recurring, calculate next due date and reset isPaid
  if (bill.isRecurring && bill.frequency) {
    const nextDueDate = calculateNextDueDate(bill.dueDate, bill.frequency as BillFrequency)
    updateData.dueDate = nextDueDate
    updateData.isPaid = false
    updateData.paidDate = null
  }

  const updatedBill = await prisma.bill.update({
    where: { id: billId },
    data: updateData,
    include: {
      category: {
        select: { id: true, name: true, icon: true, color: true },
      },
      wallet: {
        select: { id: true, name: true },
      },
      recurringTransaction: {
        select: { id: true, name: true, frequency: true },
      },
    },
  })

  return transformBill(updatedBill)
}

/**
 * Import bills from recurring transactions
 */
export async function importFromRecurring(
  userId: string,
  recurringIds: string[]
): Promise<Bill[]> {
  // Get recurring transactions that are not already linked to bills
  const existingBillLinks = await prisma.bill.findMany({
    where: {
      userId,
      recurringTransactionId: { in: recurringIds },
    },
    select: { recurringTransactionId: true },
  })

  const linkedIds = new Set(existingBillLinks.map((b) => b.recurringTransactionId))
  const unlinkedIds = recurringIds.filter((id) => !linkedIds.has(id))

  if (unlinkedIds.length === 0) {
    return []
  }

  const recurringTransactions = await prisma.recurringTransaction.findMany({
    where: {
      id: { in: unlinkedIds },
      userId,
      isActive: true,
    },
  })

  // Get all categories for this user to map category names to IDs
  const categories = await prisma.category.findMany({
    where: {
      OR: [
        { userId },
        { isDefault: true },
      ],
    },
    select: { id: true, name: true },
  })

  // Create a map of category name (lowercase) to category ID
  const categoryMap = new Map<string, string>()
  for (const cat of categories) {
    categoryMap.set(cat.name.toLowerCase(), cat.id)
  }

  const createdBills: Bill[] = []

  for (const recurring of recurringTransactions) {
    // Try to find matching category by name
    let categoryId: string | undefined = undefined
    if (recurring.category) {
      categoryId = categoryMap.get(recurring.category.toLowerCase())
    }

    const bill = await createBill(userId, {
      name: recurring.name,
      amount: recurring.amount,
      dueDate: recurring.nextPaymentDate,
      walletId: recurring.walletId,
      recurringTransactionId: recurring.id,
      categoryId, // Now includes mapped category ID
      isRecurring: true,
      frequency: recurring.frequency.toUpperCase() as BillFrequency,
      reminderDays: DEFAULT_REMINDER_DAYS,
      notes: recurring.description || undefined,
    })

    createdBills.push(bill)
  }

  return createdBills
}

/**
 * Get unlinked recurring transactions (candidates for import)
 */
export async function getUnlinkedRecurringTransactions(userId: string) {
  const linkedRecurringIds = await prisma.bill.findMany({
    where: {
      userId,
      recurringTransactionId: { not: null },
    },
    select: { recurringTransactionId: true },
  })

  const linkedIds = linkedRecurringIds
    .map((b) => b.recurringTransactionId)
    .filter((id): id is string => id !== null)

  const unlinkedRecurring = await prisma.recurringTransaction.findMany({
    where: {
      userId,
      isActive: true,
      id: linkedIds.length > 0 ? { notIn: linkedIds } : undefined,
    },
    orderBy: { nextPaymentDate: 'asc' },
  })

  return unlinkedRecurring
}

/**
 * Get bills due within the next N days (for dashboard widget)
 */
export async function getUpcomingBills(userId: string, days: number = 7): Promise<Bill[]> {
  const now = new Date()
  const futureDate = new Date()
  futureDate.setDate(futureDate.getDate() + days)

  const bills = await prisma.bill.findMany({
    where: {
      userId,
      isPaid: false,
      dueDate: {
        gte: now,
        lte: futureDate,
      },
    },
    include: {
      category: {
        select: { id: true, name: true, icon: true, color: true },
      },
      wallet: {
        select: { id: true, name: true },
      },
    },
    orderBy: { dueDate: 'asc' },
  })

  return bills.map(transformBill)
}

/**
 * Get overdue bills
 */
export async function getOverdueBills(userId: string): Promise<Bill[]> {
  const now = new Date()

  const bills = await prisma.bill.findMany({
    where: {
      userId,
      isPaid: false,
      dueDate: { lt: now },
    },
    include: {
      category: {
        select: { id: true, name: true, icon: true, color: true },
      },
      wallet: {
        select: { id: true, name: true },
      },
    },
    orderBy: { dueDate: 'asc' },
  })

  return bills.map(transformBill)
}
