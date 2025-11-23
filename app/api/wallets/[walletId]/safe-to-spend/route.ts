import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { calculateSafeToSpend } from '@/lib/safeToSpend'

/**
 * GET /api/wallets/[walletId]/safe-to-spend
 * Calculate safe-to-spend amount for a specific wallet
 *
 * Returns:
 * - Total wallet balance
 * - Upcoming bills (next 30 days)
 * - Budget allocations (remaining budgets)
 * - Savings goals (remaining to target)
 * - Emergency fund buffer
 * - Safe to spend amount (balance minus all the above)
 * - Detailed breakdown of each component
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { walletId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    const safeToSpendData = await calculateSafeToSpend(params.walletId, userId)

    return NextResponse.json(safeToSpendData)
  } catch (error: any) {
    console.error('Error calculating safe-to-spend:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to calculate safe-to-spend' },
      { status: 500 }
    )
  }
}
