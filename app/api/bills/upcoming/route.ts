import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUpcomingBills, getOverdueBills } from '@/lib/bill/bill-service'
import { getBillsSummary } from '@/lib/bill/stats-service'

// GET /api/bills/upcoming - Get bills due within the next N days (for dashboard widget)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '7', 10)
    const includeOverdue = searchParams.get('includeOverdue') === 'true'

    const upcomingBills = await getUpcomingBills(session.user.id, days)
    
    let overdueBills: Awaited<ReturnType<typeof getOverdueBills>> = []
    if (includeOverdue) {
      overdueBills = await getOverdueBills(session.user.id)
    }

    const summary = await getBillsSummary(session.user.id)

    // Calculate total amount due
    const totalAmount = upcomingBills.reduce((sum, bill) => sum + bill.amount, 0)
    const overdueAmount = overdueBills.reduce((sum, bill) => sum + bill.amount, 0)

    return NextResponse.json({
      upcoming: upcomingBills,
      overdue: overdueBills,
      totalAmount,
      overdueAmount,
      summary,
    })
  } catch (error) {
    console.error('Error fetching upcoming bills:', error)
    return NextResponse.json(
      { error: 'Failed to fetch upcoming bills' },
      { status: 500 }
    )
  }
}
