import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { calculateSavingsSummary } from '@/lib/savingsTracker'

/**
 * GET /api/savings
 * Get savings summary with breakdown by type
 * Query params:
 * - walletId (optional): Filter by wallet
 * - timeRange (optional): 'this_month' | 'last_3_months' | 'all_time' (default: 'all_time')
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const searchParams = req.nextUrl.searchParams
    const walletId = searchParams.get('walletId') || undefined
    const timeRange = (searchParams.get('timeRange') || 'all_time') as 'this_month' | 'last_3_months' | 'all_time'

    const summary = await calculateSavingsSummary(userId, {
      walletId,
      timeRange,
    })

    return NextResponse.json(summary)
  } catch (error: any) {
    console.error('Error fetching savings summary:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch savings summary' },
      { status: 500 }
    )
  }
}
