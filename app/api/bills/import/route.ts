import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { importFromRecurring, getUnlinkedRecurringTransactions } from '@/lib/bill/bill-service'
import { createReminders } from '@/lib/bill/reminder-service'

// GET /api/bills/import - Get unlinked recurring transactions (candidates for import)
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const candidates = await getUnlinkedRecurringTransactions(session.user.id)

    return NextResponse.json({ candidates })
  } catch (error) {
    console.error('Error fetching import candidates:', error)
    return NextResponse.json(
      { error: 'Failed to fetch import candidates' },
      { status: 500 }
    )
  }
}

// POST /api/bills/import - Import bills from recurring transactions
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    if (!body.recurringIds || !Array.isArray(body.recurringIds)) {
      return NextResponse.json(
        { error: 'recurringIds must be an array' },
        { status: 400 }
      )
    }

    if (body.recurringIds.length === 0) {
      return NextResponse.json(
        { error: 'At least one recurring transaction ID is required' },
        { status: 400 }
      )
    }

    const bills = await importFromRecurring(session.user.id, body.recurringIds)

    // Create reminders for each imported bill
    for (const bill of bills) {
      await createReminders(bill.id, session.user.id, bill.dueDate, bill.reminderDays)
    }

    return NextResponse.json({
      imported: bills.length,
      bills,
    })
  } catch (error) {
    console.error('Error importing bills:', error)
    return NextResponse.json(
      { error: 'Failed to import bills' },
      { status: 500 }
    )
  }
}
