import prisma from '@/lib/prisma'
import { BillReminder, ReminderStatus } from '@/app/types/bill'

/**
 * Create reminders for a bill based on its reminderDays configuration
 */
export async function createReminders(
  billId: string,
  userId: string,
  dueDate: Date | string,
  reminderDays: number[]
): Promise<BillReminder[]> {
  const dueDateObj = new Date(dueDate)
  const reminders: BillReminder[] = []

  for (const daysBefore of reminderDays) {
    const reminderDate = new Date(dueDateObj)
    reminderDate.setDate(reminderDate.getDate() - daysBefore)

    // Only create reminder if it's in the future
    if (reminderDate > new Date()) {
      const reminder = await prisma.billReminder.create({
        data: {
          billId,
          userId,
          reminderDate,
          daysBefore,
          status: 'PENDING',
        },
      })
      reminders.push(reminder as BillReminder)
    }
  }

  return reminders
}

/**
 * Process all pending reminders that are due
 * Creates alerts for users about upcoming bills
 */
export async function processReminders(): Promise<{
  processed: number
  failed: number
  errors: string[]
}> {
  const now = new Date()

  // Find all pending reminders that are due
  const dueReminders = await prisma.billReminder.findMany({
    where: {
      status: 'PENDING',
      reminderDate: { lte: now },
    },
    include: {
      bill: true,
    },
  })

  const results = {
    processed: 0,
    failed: 0,
    errors: [] as string[],
  }

  for (const reminder of dueReminders) {
    try {
      // Create an alert for the user
      await prisma.alert.create({
        data: {
          userId: reminder.userId,
          type: 'BILL_REMINDER',
          title: `Bill Due Soon: ${reminder.bill.name}`,
          message: `Your bill "${reminder.bill.name}" for Rp ${reminder.bill.amount.toLocaleString('id-ID')} is due in ${reminder.daysBefore} day(s).`,
          additionalData: JSON.stringify({
            billId: reminder.billId,
            amount: reminder.bill.amount,
            dueDate: reminder.bill.dueDate,
            daysBefore: reminder.daysBefore,
          }),
        },
      })

      // Update reminder status to SENT
      await prisma.billReminder.update({
        where: { id: reminder.id },
        data: { status: 'SENT' },
      })

      results.processed++
    } catch (error) {
      results.failed++
      results.errors.push(
        `Reminder ${reminder.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  return results
}

/**
 * Dismiss a reminder
 */
export async function dismissReminder(
  reminderId: string,
  userId: string
): Promise<void> {
  const reminder = await prisma.billReminder.findFirst({
    where: { id: reminderId, userId },
  })

  if (!reminder) {
    throw new Error('Reminder not found')
  }

  await prisma.billReminder.update({
    where: { id: reminderId },
    data: { status: 'DISMISSED' },
  })
}

/**
 * Snooze a reminder for a specified number of hours
 */
export async function snoozeReminder(
  reminderId: string,
  userId: string,
  hours: number
): Promise<BillReminder> {
  const reminder = await prisma.billReminder.findFirst({
    where: { id: reminderId, userId },
  })

  if (!reminder) {
    throw new Error('Reminder not found')
  }

  const snoozedUntil = new Date()
  snoozedUntil.setHours(snoozedUntil.getHours() + hours)

  const updated = await prisma.billReminder.update({
    where: { id: reminderId },
    data: {
      status: 'SNOOZED',
      snoozedUntil,
      reminderDate: snoozedUntil, // Reschedule to snoozed time
    },
  })

  return updated as BillReminder
}

/**
 * Get active reminders for a user (pending or snoozed that are due)
 */
export async function getActiveReminders(userId: string): Promise<BillReminder[]> {
  const now = new Date()

  const reminders = await prisma.billReminder.findMany({
    where: {
      userId,
      OR: [
        { status: 'PENDING', reminderDate: { lte: now } },
        { status: 'SNOOZED', snoozedUntil: { lte: now } },
      ],
    },
    include: {
      bill: {
        include: {
          category: {
            select: { id: true, name: true, icon: true, color: true },
          },
        },
      },
    },
    orderBy: { reminderDate: 'asc' },
  })

  return reminders as BillReminder[]
}

/**
 * Get all reminders for a bill
 */
export async function getBillReminders(
  billId: string,
  userId: string
): Promise<BillReminder[]> {
  const reminders = await prisma.billReminder.findMany({
    where: { billId, userId },
    orderBy: { reminderDate: 'asc' },
  })

  return reminders as BillReminder[]
}

/**
 * Delete all reminders for a bill (used when bill is deleted or paid)
 */
export async function deleteRemindersForBill(billId: string): Promise<void> {
  await prisma.billReminder.deleteMany({
    where: { billId },
  })
}

/**
 * Regenerate reminders for a bill (used when due date changes)
 */
export async function regenerateReminders(
  billId: string,
  userId: string,
  dueDate: Date | string,
  reminderDays: number[]
): Promise<BillReminder[]> {
  // Delete existing pending reminders
  await prisma.billReminder.deleteMany({
    where: {
      billId,
      status: 'PENDING',
    },
  })

  // Create new reminders
  return createReminders(billId, userId, dueDate, reminderDays)
}

/**
 * Generate notification content for a reminder
 */
export function generateNotificationContent(
  billName: string,
  amount: number,
  daysBefore: number
): { title: string; message: string } {
  const title = `Bill Due Soon: ${billName}`
  const message = `Your bill "${billName}" for Rp ${amount.toLocaleString('id-ID')} is due in ${daysBefore} day(s).`

  return { title, message }
}

/**
 * Calculate snooze end time
 */
export function calculateSnoozeEndTime(hours: number): Date {
  const snoozedUntil = new Date()
  snoozedUntil.setHours(snoozedUntil.getHours() + hours)
  return snoozedUntil
}
