import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getBill, updateBill, deleteBill } from '@/lib/bill/bill-service'
import { regenerateReminders } from '@/lib/bill/reminder-service'

interface RouteParams {
  params: Promise<{ billId: string }>
}

// GET /api/bills/[billId] - Get a single bill
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { billId } = await params
    const bill = await getBill(billId, session.user.id)

    if (!bill) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 })
    }

    return NextResponse.json(bill)
  } catch (error) {
    console.error('Error fetching bill:', error)
    return NextResponse.json(
      { error: 'Failed to fetch bill' },
      { status: 500 }
    )
  }
}

// PUT /api/bills/[billId] - Update a bill
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { billId } = await params
    const body = await request.json()

    // Validate amount if provided
    if (body.amount !== undefined && (typeof body.amount !== 'number' || body.amount <= 0)) {
      return NextResponse.json(
        { error: 'Amount must be a positive number' },
        { status: 400 }
      )
    }

    // Validate reminder days if provided
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

    const bill = await updateBill(billId, session.user.id, body)

    // Regenerate reminders if due date or reminder days changed
    if (body.dueDate || body.reminderDays) {
      await regenerateReminders(
        bill.id,
        session.user.id,
        bill.dueDate,
        bill.reminderDays
      )
    }

    return NextResponse.json(bill)
  } catch (error) {
    console.error('Error updating bill:', error)
    
    if (error instanceof Error && error.message === 'Bill not found') {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 })
    }
    
    return NextResponse.json(
      { error: 'Failed to update bill' },
      { status: 500 }
    )
  }
}

// DELETE /api/bills/[billId] - Delete a bill
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { billId } = await params
    await deleteBill(billId, session.user.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting bill:', error)
    
    if (error instanceof Error && error.message === 'Bill not found') {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 })
    }
    
    return NextResponse.json(
      { error: 'Failed to delete bill' },
      { status: 500 }
    )
  }
}
