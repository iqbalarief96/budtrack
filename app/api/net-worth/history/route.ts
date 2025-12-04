import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { snapshotService } from '@/lib/net-worth/snapshot-service'
import type { TimePeriod, NetWorthHistoryResponse } from '@/app/types/net-worth'

/**
 * GET /api/net-worth/history
 * Returns historical net worth snapshots with optional time filtering
 * 
 * Query params:
 * - period: '3M' | '6M' | '1Y' | 'ALL' (default: 'ALL')
 * 
 * Requirements: 2.1, 2.2
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const periodParam = searchParams.get('period')
    
    // Validate period parameter
    const validPeriods: TimePeriod[] = ['3M', '6M', '1Y', 'ALL']
    const period: TimePeriod = validPeriods.includes(periodParam as TimePeriod)
      ? (periodParam as TimePeriod)
      : 'ALL'

    // Get historical snapshots with filtering (Requirements: 2.1, 2.2)
    const snapshots = await snapshotService.getHistory(session.user.id, { period })

    const response: NetWorthHistoryResponse = {
      snapshots,
      period,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching net worth history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch net worth history' },
      { status: 500 }
    )
  }
}
