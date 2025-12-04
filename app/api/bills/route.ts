import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createBill, getBills } from '@/lib/bill/bill-service'
import { createReminders } from '@/lib/bill/reminder-service'
import { BillFilters } from '@/app/types/bill'

// GET /api/bills - Get all bills for the user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    
    const filters: BillFilters = {}
    
    const status = searchParams.get('status')
    if (status) {
      filters.status = status.split(',') as any
    }
    
    const categoryId = searchParams.get('categoryId')
    if (categoryId) {
      filters.categoryId = categoryId
    }
    
    const walletId = searchParams.get('walletId')
    if (walletId) {
      filters.walletId = walletId
    }
    
    const isPaid = searchParams.get('isPaid')
    if (isPaid !== null) {
      filters.isPaid = isPaid === 'true'
    }
    
    const search = searchParams.get('search')
    if (search) {
      filters.search = search
    }

    const bills = await getBills(session.user.id, filters)

    return NextResponse.json({ bills, total: bills.length })
  } catch (error) {
    console.error('Error fetching bills:', error)
    return NextResponse.json(
      { error: 'Failed to fetch bills' },
      { status: 500 }
    )
  }
}

// POST /api/bills - Create a new bill
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // Validate required fields
    if (!body.name || !body.amount || !body.dueDate || !body.walletId) {
      return NextResponse.json(
        { error: 'Missing required fields: name, amount, dueDate, walletId' },
        { status: 400 }
      )
    }

    // Validate amount
    if (typeof body.amount !== 'number' || body.amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be a positive number' },
        { status: 400 }
      )
    }

    // Validate reminder days
    if (body.reminderDays) {
      if (!Array.isArray(body.reminderDays)) {
        return NextResponse.json(
          { error: 'reminderDays must be an array' },
          { status: 400 }
        )
      }
      
      const invalidDays = body.reminderDays.some(
        (d: number) => typeof d !== 'number' || d < 0 || d > 30
      )
      if (invalidDays) {
        return NextResponse.json(
          { error: 'reminderDays must contain numbers between 0 and 30' },
          { status: 400 }
        )
      }
    }

    const bill = await createBill(session.user.id, body)

    // Create reminders for the bill
    const reminderDays = body.reminderDays || [1, 3, 7]
    await createReminders(bill.id, session.user.id, bill.dueDate, reminderDays)

    return NextResponse.json(bill, { status: 201 })
  } catch (error) {
    console.error('Error creating bill:', error)
    return NextResponse.json(
      { error: 'Failed to create bill' },
      { status: 500 }
    )
  }
}
