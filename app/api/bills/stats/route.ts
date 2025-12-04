import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getBillStats, getPaymentHistory } from '@/lib/bill/stats-service'

// GET /api/bills/stats - Get bill statistics
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const months = parseInt(searchParams.get('months') || '12', 10)
    const billId = searchParams.get('billId')

    // If billId is provided, return payment history for that bill
    if (billId) {
      const payments = await getPaymentHistory(billId, session.user.id)
      return NextResponse.json({ payments })
    }

    // Otherwise, return overall statistics
    const stats = await getBillStats(session.user.id, months)

    return NextResponse.json({ stats })
  } catch (error) {
    console.error('Error fetching bill stats:', error)
    
    if (error instanceof Error && error.message === 'Bill not found') {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 })
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch bill statistics' },
      { status: 500 }
    )
  }
}
