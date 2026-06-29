import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createSharedBill, listSharedBills } from '@/lib/shared-bills/shared-bill-service'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const sharedBills = await listSharedBills(session.user.id, {
      status: searchParams.get('status'),
      walletId: searchParams.get('walletId'),
      walletGroupId: searchParams.get('walletGroupId'),
    })

    const summary = sharedBills.reduce(
      (acc, bill) => {
        const paidAmount = bill.participants.reduce((sum, participant) => sum + participant.paidAmount, 0)
        const outstandingAmount = Math.max(0, bill.totalAmount - paidAmount)
        acc.totalAmount += bill.totalAmount
        acc.paidAmount += paidAmount
        acc.outstandingAmount += outstandingAmount
        if (bill.status === 'paid') acc.paidCount += 1
        if (bill.status === 'open' || bill.status === 'partially_paid') acc.openCount += 1
        return acc
      },
      { totalAmount: 0, paidAmount: 0, outstandingAmount: 0, openCount: 0, paidCount: 0 }
    )

    return NextResponse.json({ sharedBills, total: sharedBills.length, summary })
  } catch (error) {
    console.error('Error fetching shared bills:', error)
    return NextResponse.json({ error: 'Failed to fetch shared bills' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const sharedBill = await createSharedBill(session.user.id, body)
    return NextResponse.json({ sharedBill, message: 'Shared bill created successfully' }, { status: 201 })
  } catch (error) {
    console.error('Error creating shared bill:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create shared bill' },
      { status: 400 }
    )
  }
}
