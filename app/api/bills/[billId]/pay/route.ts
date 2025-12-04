import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { markBillAsPaid } from '@/lib/bill/bill-service'
import { deleteRemindersForBill, createReminders } from '@/lib/bill/reminder-service'

interface RouteParams {
  params: Promise<{ billId: string }>
}

// POST /api/bills/[billId]/pay - Mark a bill as paid
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { billId } = await params
    const body = await request.json().catch(() => ({}))

    const paidDate = body.paidDate ? new Date(body.paidDate) : undefined

    const bill = await markBillAsPaid(billId, session.user.id, paidDate)

    // Delete old reminders
    await deleteRemindersForBill(billId)

    // If recurring, create new reminders for next due date
    if (bill.isRecurring && !bill.isPaid) {
      await createReminders(bill.id, session.user.id, bill.dueDate, bill.reminderDays)
    }

    return NextResponse.json(bill)
  } catch (error) {
    console.error('Error marking bill as paid:', error)
    
    if (error instanceof Error && error.message === 'Bill not found') {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 })
    }
    
    return NextResponse.json(
      { error: 'Failed to mark bill as paid' },
      { status: 500 }
    )
  }
}
