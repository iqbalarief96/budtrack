import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { getSavingsByType, SavingsType } from '@/lib/savingsTracker'

/**
 * GET /api/savings/[type]
 * Get savings details for a specific type
 * Query params:
 * - walletId (optional): Filter by wallet
 * - timeRange (optional): 'this_month' | 'last_3_months' | 'all_time' (default: 'all_time')
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { type: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const searchParams = req.nextUrl.searchParams
    const walletId = searchParams.get('walletId') || undefined
    const timeRange = (searchParams.get('timeRange') || 'all_time') as 'this_month' | 'last_3_months' | 'all_time'

    // Validate savings type
    const savingsType = params.type.toUpperCase() as SavingsType
    if (!Object.values(SavingsType).includes(savingsType)) {
      return NextResponse.json(
        { error: 'Invalid savings type' },
        { status: 400 }
      )
    }

    const savingsData = await getSavingsByType(userId, savingsType, {
      walletId,
      timeRange,
    })

    return NextResponse.json(savingsData)
  } catch (error: any) {
    console.error('Error fetching savings by type:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch savings by type' },
      { status: 500 }
    )
  }
}
